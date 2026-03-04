#!/bin/bash

# =============================================================================
# Elastic Demo Starter - Foundation Builder
# =============================================================================
# Sets up git isolation (branch + optional fork), installs all prerequisites
# and dependencies, connects the OOTB shared cluster, starts servers, and
# tells the user what to do next.
#
# Only prompts: branch name and optional fork creation (first run only).
# Feature selection and credential gathering are handled by the AI assistant.
#
# For advanced/manual configuration, run: uv run scripts/interactive_setup.py
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

ERRORS=()

log_ok()   { echo -e "  ${GREEN}OK${NC}  $1"; }
log_warn() { echo -e "  ${YELLOW}!!${NC}  $1"; }
log_fail() { echo -e "  ${RED}FAIL${NC}  $1"; ERRORS+=("$1"); }
log_info() { echo -e "  ${DIM}..${NC}  $1"; }

# Detect hive-mind content across legacy and newer layouts.
is_hive_mind_loaded() {
    [ -d "hive-mind/patterns" ] || \
    [ -f "hive-mind/.hive-mind-index.json" ] || \
    [ -d "hive-mind/skills" ] || \
    [ -d "hive-mind/.cursor/skills" ]
}

# =============================================================================
# Step 1: Check & install prerequisites
# =============================================================================

echo ""
echo -e "${BOLD}Elastic Demo Starter - Setup${NC}"
echo -e "${DIM}Foundation builder. Installs deps, connects cluster, starts servers.${NC}"
echo ""

# =============================================================================
# Step 0: Git setup — ensure the user isn't working directly on the template main
# =============================================================================

TEMPLATE_REPO="elastic/elastic-demo-starter"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")

# Detect if origin points to the template repo and user is on main
IS_TEMPLATE_ORIGIN=false
if echo "$ORIGIN_URL" | grep -q "$TEMPLATE_REPO"; then
    IS_TEMPLATE_ORIGIN=true
fi

if [ "$IS_TEMPLATE_ORIGIN" = true ] && [ "$CURRENT_BRANCH" = "main" ]; then
    echo -e "${YELLOW}${BOLD}Git setup needed${NC}"
    echo ""
    echo -e "  You're on ${BOLD}main${NC} with origin pointing to the template repo."
    echo -e "  Demo work should happen on a dedicated branch so main stays clean."
    echo ""

    # Derive a suggested branch name from the folder name
    FOLDER_NAME=$(basename "$SCRIPT_DIR")
    SUGGESTED_BRANCH=""
    if [ "$FOLDER_NAME" != "elastic-demo-starter" ] && [ "$FOLDER_NAME" != "elastic-agent-starter" ]; then
        # Folder was renamed — use it as the branch name
        SANITIZED=$(echo "$FOLDER_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
        SUGGESTED_BRANCH="demo/$SANITIZED"
    fi

    # Ask for branch name (only interactive prompt in the whole script)
    if [ -n "$SUGGESTED_BRANCH" ]; then
        echo -e "  Suggested branch: ${GREEN}${SUGGESTED_BRANCH}${NC} (based on folder name)"
        echo -ne "  ${BOLD}Branch name${NC} [${SUGGESTED_BRANCH}]: "
    else
        echo -e "  ${DIM}Name it after the customer or use case, e.g. demo/ifs-field-service${NC}"
        echo -ne "  ${BOLD}Branch name${NC} [demo/my-demo]: "
    fi

    read -r USER_BRANCH
    DEMO_BRANCH="${USER_BRANCH:-${SUGGESTED_BRANCH:-demo/my-demo}}"

    # Create the branch
    git checkout -b "$DEMO_BRANCH" 2>/dev/null
    echo -e "  ${GREEN}OK${NC}  Created branch ${BOLD}${DEMO_BRANCH}${NC}"

    # Offer to create a fork if gh is authenticated
    if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
        GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "")
        FORK_URL=$(gh api "repos/$TEMPLATE_REPO/forks" --jq ".[] | select(.owner.login == \"$GH_USER\") | .clone_url" 2>/dev/null | head -1)

        if [ -n "$FORK_URL" ]; then
            # Fork already exists — add it as a remote if not already present
            EXISTING_FORK=$(git remote -v 2>/dev/null | grep "$GH_USER" | head -1 | awk '{print $1}')
            if [ -z "$EXISTING_FORK" ]; then
                git remote add fork "$FORK_URL" 2>/dev/null
                echo -e "  ${GREEN}OK${NC}  Added your fork as remote ${BOLD}fork${NC}"
            else
                echo -e "  ${GREEN}OK${NC}  Fork remote already configured (${EXISTING_FORK})"
            fi
        else
            echo -ne "  ${BOLD}Create a GitHub fork?${NC} [Y/n]: "
            read -r CREATE_FORK
            if [ "${CREATE_FORK:-Y}" != "n" ] && [ "${CREATE_FORK:-Y}" != "N" ]; then
                FORK_RESULT=$(gh repo fork "$TEMPLATE_REPO" --remote --remote-name fork 2>&1)
                if [ $? -eq 0 ]; then
                    echo -e "  ${GREEN}OK${NC}  Forked and added as remote ${BOLD}fork${NC}"
                else
                    echo -e "  ${YELLOW}!!${NC}  Could not create fork (you can do this later)"
                    echo -e "       ${DIM}${FORK_RESULT}${NC}"
                fi
            fi
        fi

        echo -e "  ${DIM}Push your demo work with: git push -u fork ${DEMO_BRANCH}${NC}"
    fi
    echo ""
elif [ "$IS_TEMPLATE_ORIGIN" = false ] && [ "$CURRENT_BRANCH" = "main" ]; then
    # Origin is a fork or custom repo — just suggest a branch
    echo -e "${DIM}Tip: Consider creating a demo branch (git checkout -b demo/customer-name) to keep main clean.${NC}"
    echo ""
fi

echo -e "${BLUE}[1/6] Checking prerequisites${NC}"

# --- Python version ---
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 10 ]; then
        log_ok "Python $PY_VERSION"
    else
        log_fail "Python $PY_VERSION found but 3.10+ required"
    fi
else
    log_fail "Python 3 not found"
fi

# --- Node version ---
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null | sed 's/^v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        log_ok "Node.js $NODE_VERSION"
    else
        log_fail "Node.js $NODE_VERSION found but 18+ required"
    fi
else
    log_fail "Node.js not found (install from https://nodejs.org/)"
fi

# --- git ---
if command -v git &> /dev/null; then
    log_ok "git"
else
    log_fail "git not found"
fi

# --- uv (install if missing) ---
if command -v uv &> /dev/null; then
    log_ok "uv $(uv --version 2>/dev/null | head -1 | awk '{print $2}')"
else
    log_info "Installing uv..."
    if curl -LsSf https://astral.sh/uv/install.sh | sh > /dev/null 2>&1; then
        # Source uv into PATH
        if [ -f "$HOME/.cargo/env" ]; then
            source "$HOME/.cargo/env"
        elif [ -f "$HOME/.local/bin/uv" ]; then
            export PATH="$HOME/.local/bin:$PATH"
        fi

        if command -v uv &> /dev/null; then
            log_ok "uv installed"
        else
            log_warn "uv installed but not in PATH. Restart your terminal and re-run ./setup.sh"
        fi
    else
        log_fail "Failed to install uv (https://docs.astral.sh/uv/)"
    fi
fi

# --- beads (bd) ---
if command -v bd &> /dev/null; then
    log_ok "beads (bd)"
else
    log_info "Installing beads..."
    if command -v uv &> /dev/null; then
        if uv pip install --system beads > /dev/null 2>&1 || pip install beads > /dev/null 2>&1; then
            log_ok "beads installed"
        else
            log_warn "Could not install beads (optional - issue tracking)"
        fi
    elif command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
        if pip install beads > /dev/null 2>&1 || pip3 install beads > /dev/null 2>&1; then
            log_ok "beads installed"
        else
            log_warn "Could not install beads (optional - issue tracking)"
        fi
    else
        log_warn "Could not install beads (no pip found, optional)"
    fi
fi

# --- gh CLI (needed for OOTB credentials) ---
HAS_GH=false
if command -v gh &> /dev/null; then
    if gh auth status &> /dev/null; then
        log_ok "GitHub CLI (authenticated)"
        HAS_GH=true
    else
        log_warn "GitHub CLI found but not authenticated (run: gh auth login)"
    fi
else
    log_warn "GitHub CLI not found (needed for OOTB cluster credentials)"
    echo -e "       ${DIM}Install: brew install gh  |  Then: gh auth login${NC}"
fi

# Bail if critical prereqs missing
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Cannot continue - fix the issues above and re-run ./setup.sh${NC}"
    exit 1
fi

# =============================================================================
# Step 2: Git submodules (hive-mind)
# =============================================================================

echo ""
echo -e "${BLUE}[2/6] Initializing project${NC}"

if [ -d "hive-mind" ] && ! is_hive_mind_loaded; then
    log_info "Initializing hive-mind submodule..."
    SUBMODULE_ERR=$(git submodule update --init --recursive 2>&1)
    if [ $? -eq 0 ]; then
        log_ok "hive-mind submodule"
    else
        # Pinned commit may no longer exist (force-push in submodule repo).
        # Retry with --remote to fetch the current branch HEAD instead.
        if echo "$SUBMODULE_ERR" | grep -q "not our ref\|did not contain"; then
            log_info "Pinned commit not found, fetching latest from remote..."
            SUBMODULE_ERR2=$(git submodule deinit -f hive-mind 2>&1 && git submodule update --init --remote hive-mind 2>&1)
            if [ $? -eq 0 ]; then
                log_ok "hive-mind submodule (fetched latest)"
            else
                log_warn "Could not init hive-mind submodule (AI assistance will be limited)"
                echo -e "       ${DIM}${SUBMODULE_ERR2}${NC}"
            fi
        else
            log_warn "Could not init hive-mind submodule (AI assistance will be limited)"
            echo -e "       ${DIM}${SUBMODULE_ERR}${NC}"
            echo -e "       ${DIM}This is a private repo — check your GitHub credentials:${NC}"
            echo -e "       ${DIM}  gh auth status   # GitHub CLI auth${NC}"
            echo -e "       ${DIM}  ssh -T git@github.com   # SSH auth${NC}"
            echo -e "       ${DIM}After fixing, re-run: git submodule update --init${NC}"
        fi
    fi
elif is_hive_mind_loaded; then
    log_ok "hive-mind submodule"
else
    log_info "No hive-mind submodule (not a blocker)"
fi

if [ -d "hive-mind/.cursor/skills" ] || [ -d "hive-mind/skills" ]; then
    log_info "Detected hive-mind skills format"
elif [ -d "hive-mind/patterns" ]; then
    log_info "Detected hive-mind patterns format"
fi

# =============================================================================
# Step 3: Install dependencies
# =============================================================================

echo ""
echo -e "${BLUE}[3/6] Installing dependencies${NC}"

# --- Backend (Python via uv) ---
log_info "Backend dependencies (Python)..."
if command -v uv &> /dev/null; then
    (cd backend && uv sync > /dev/null 2>&1) && \
        log_ok "Backend dependencies (uv sync)" || \
        log_fail "Backend dependency install failed"

    # Keep requirements.txt in sync (used by CI and Dockerfiles)
    log_info "Syncing requirements.txt from pyproject.toml..."
    if (cd backend && uv pip compile pyproject.toml -o requirements.txt --quiet 2>/dev/null); then
        # Add auto-generated header
        TEMP_REQ=$(mktemp)
        echo "# AUTO-GENERATED from pyproject.toml — do not edit manually." > "$TEMP_REQ"
        echo "# To update: cd backend && uv pip compile pyproject.toml -o requirements.txt" >> "$TEMP_REQ"
        echo "" >> "$TEMP_REQ"
        cat backend/requirements.txt >> "$TEMP_REQ"
        mv "$TEMP_REQ" backend/requirements.txt
        log_ok "requirements.txt synced"
    else
        log_warn "Could not sync requirements.txt (update manually if needed)"
    fi

    # Verify the backend actually imports (catches missing dependencies)
    log_info "Verifying backend imports..."
    IMPORT_ERR=$(cd backend && uv run python -c "from app.main import app" 2>&1)
    if [ $? -eq 0 ]; then
        log_ok "Backend imports verified"
    else
        log_fail "Backend import check failed"
        echo -e "       ${DIM}${IMPORT_ERR}${NC}" | tail -5 | sed 's/^/       /'
    fi
else
    log_warn "uv not available, skipping backend install"
fi

# --- Frontend (Node.js) ---
log_info "Frontend dependencies (Node.js)..."
if [ -f "frontend/yarn.lock" ] && command -v yarn &> /dev/null; then
    (cd frontend && yarn install --non-interactive --silent > /dev/null 2>&1) && \
        log_ok "Frontend dependencies (yarn)" || \
        log_fail "Frontend dependency install failed"
elif command -v npm &> /dev/null; then
    (cd frontend && npm install --no-fund --no-audit --loglevel=error > /dev/null 2>&1) && \
        log_ok "Frontend dependencies (npm)" || \
        log_fail "Frontend dependency install failed"
else
    log_fail "No package manager found (yarn or npm)"
fi

# =============================================================================
# Step 4: Connect OOTB cluster
# =============================================================================

echo ""
echo -e "${BLUE}[4/6] Configuring Elastic connection${NC}"

if [ ! -f "backend/.env" ]; then
    # No .env at all - create from example
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        log_info "Created backend/.env from template"
    else
        touch backend/.env
        log_info "Created empty backend/.env"
    fi
fi

# Try to connect OOTB cluster if gh is available and .env doesn't already have credentials
EXISTING_KIBANA=$(grep -s '^KIBANA_URL=.\+' backend/.env | head -1)
if [ -n "$EXISTING_KIBANA" ]; then
    log_ok "Elastic credentials already configured"
else
    if [ "$HAS_GH" = true ]; then
        log_info "Fetching OOTB cluster credentials from GitHub..."

        OOTB_ES=$(gh variable get OOTB_ELASTICSEARCH_URL 2>/dev/null || true)
        OOTB_KB=$(gh variable get OOTB_KIBANA_URL 2>/dev/null || true)
        OOTB_KEY=$(gh variable get OOTB_READONLY_API_KEY 2>/dev/null || true)

        if [ -n "$OOTB_ES" ] && [ -n "$OOTB_KB" ] && [ -n "$OOTB_KEY" ]; then
            # Use the dev script's update_env_value logic inline
            update_env() {
                local key=$1 value=$2 file="backend/.env"
                if grep -q "^${key}=" "$file" 2>/dev/null; then
                    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
                    rm -f "${file}.bak"
                else
                    echo "${key}=${value}" >> "$file"
                fi
            }

            update_env "ELASTICSEARCH_URL" "$OOTB_ES"
            update_env "KIBANA_URL" "$OOTB_KB"
            update_env "ELASTIC_API_KEY" "$OOTB_KEY"

            log_ok "Connected to OOTB shared cluster"
        else
            log_warn "Could not fetch OOTB credentials (you may not have repo access)"
            log_info "Your AI assistant will help you configure credentials later"
        fi
    else
        log_warn "Skipping OOTB cluster (gh CLI not available)"
        log_info "Your AI assistant will help you configure credentials later"
    fi
fi

# =============================================================================
# Step 5: Start servers
# =============================================================================

echo ""
echo -e "${BLUE}[5/6] Starting servers${NC}"

log_info "Starting backend and frontend..."
./dev start 2>&1 | while IFS= read -r line; do
    echo -e "       ${DIM}${line}${NC}"
done

# Read actual ports
BACKEND_PORT="8001"
FRONTEND_PORT="3000"
[ -f ".dev-pids/backend.port" ] && BACKEND_PORT=$(cat .dev-pids/backend.port)
[ -f ".dev-pids/frontend.port" ] && FRONTEND_PORT=$(cat .dev-pids/frontend.port)

# Poll for backend health (up to 10 seconds)
BACKEND_OK=false
for i in $(seq 1 20); do
    if curl -s --max-time 1 "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        BACKEND_OK=true
        break
    fi
    sleep 0.5
done

if [ "$BACKEND_OK" = true ]; then
    log_ok "Backend running on port $BACKEND_PORT"
else
    log_fail "Backend failed to start on port $BACKEND_PORT"
    if [ -f ".dev-logs/backend.log" ]; then
        echo -e "       ${DIM}Last 10 lines of backend log:${NC}"
        tail -10 .dev-logs/backend.log 2>/dev/null | while IFS= read -r line; do
            echo -e "       ${DIM}${line}${NC}"
        done
    fi
fi

# Poll for frontend (up to 10 seconds)
FRONTEND_OK=false
for i in $(seq 1 20); do
    if curl -s --max-time 1 "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        FRONTEND_OK=true
        break
    fi
    sleep 0.5
done

if [ "$FRONTEND_OK" = true ]; then
    log_ok "Frontend running on port $FRONTEND_PORT"
else
    log_warn "Frontend starting (may take a moment) on port $FRONTEND_PORT"
fi

# =============================================================================
# Configure Playwright MCP for Claude Code (browser tools for branding extraction)
# =============================================================================

echo ""
echo -e "${BLUE}[6/6] Configuring browser tools${NC}"

MCP_JSON="$SCRIPT_DIR/.mcp.json"
PLAYWRIGHT_CONFIGURED=false

# Check if .mcp.json already has playwright configured
if [ -f "$MCP_JSON" ]; then
    if grep -q '"playwright"' "$MCP_JSON" 2>/dev/null; then
        log_ok "Playwright MCP already configured in .mcp.json"
        PLAYWRIGHT_CONFIGURED=true
    fi
fi

if [ "$PLAYWRIGHT_CONFIGURED" = false ]; then
    # Check if npx is available (Node.js was already verified above)
    if command -v npx &> /dev/null; then
        # Verify @playwright/mcp package is resolvable
        if npx --yes @playwright/mcp@latest --version > /dev/null 2>&1; then
            # Create or update .mcp.json
            if [ -f "$MCP_JSON" ]; then
                # .mcp.json exists but without playwright — merge it in
                # Use Node.js to safely merge JSON
                node -e "
                    const fs = require('fs');
                    const existing = JSON.parse(fs.readFileSync('$MCP_JSON', 'utf8'));
                    if (!existing.mcpServers) existing.mcpServers = {};
                    existing.mcpServers.playwright = {
                        command: 'npx',
                        args: ['@playwright/mcp@latest']
                    };
                    fs.writeFileSync('$MCP_JSON', JSON.stringify(existing, null, 2) + '\n');
                " 2>/dev/null && \
                    log_ok "Added Playwright MCP to existing .mcp.json" || \
                    log_warn "Could not update .mcp.json (add Playwright MCP manually)"
            else
                # Create new .mcp.json with playwright
                cat > "$MCP_JSON" << 'MCPJSON'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
MCPJSON
                log_ok "Created .mcp.json with Playwright MCP"
            fi
        else
            log_warn "Playwright MCP package not available"
            echo -e "       ${DIM}Browser tools enable AI-powered branding extraction.${NC}"
            echo -e "       ${DIM}To install: npm install -g @playwright/mcp${NC}"
            echo -e "       ${DIM}Then re-run ./setup.sh to auto-configure.${NC}"
        fi
    else
        log_warn "npx not available — cannot configure Playwright MCP"
        echo -e "       ${DIM}Install Node.js 18+ and re-run ./setup.sh${NC}"
    fi
fi

# =============================================================================
# Install global hive-mind awareness for AI tools (Claude Code + Cursor)
# =============================================================================

if [ -f "hive-mind/install.sh" ]; then
    bash hive-mind/install.sh --minimal
else
    log_info "hive-mind/install.sh not found — skipping global AI awareness"
fi

# =============================================================================
# Detect IDE and print next steps
# =============================================================================

echo ""
echo -e "${GREEN}${BOLD}Setup complete!${NC}"
echo ""

# Detect IDE
IDE_NAME=""
IDE_CMD=""

if command -v cursor &> /dev/null; then
    IDE_NAME="Cursor"
    IDE_CMD="cursor ."
elif command -v claude &> /dev/null; then
    IDE_NAME="Claude Code"
    IDE_CMD="claude"
elif command -v code &> /dev/null; then
    IDE_NAME="VS Code"
    IDE_CMD="code ."
fi

echo -e "${BOLD}Next step:${NC}"
echo ""

if [ -n "$IDE_NAME" ]; then
    echo -e "  Open this project in ${GREEN}${BOLD}${IDE_NAME}${NC} and tell your AI assistant:"
    echo ""
    echo -e "    ${BLUE}\"Read and follow docs/prompts/WELCOME_PROMPT.md\"${NC}"
    echo ""
    if [ "$IDE_CMD" = "claude" ]; then
        echo -e "  Or run: ${DIM}${IDE_CMD}${NC}  (it will pick up the prompt automatically)"
    else
        echo -e "  Or run: ${DIM}${IDE_CMD}${NC}"
    fi
else
    echo -e "  Open this project in ${GREEN}${BOLD}Cursor${NC}, ${GREEN}${BOLD}Claude Code${NC}, or ${GREEN}${BOLD}VS Code${NC}"
    echo -e "  and tell your AI assistant:"
    echo ""
    echo -e "    ${BLUE}\"Read and follow docs/prompts/WELCOME_PROMPT.md\"${NC}"
fi

echo ""
echo -e "${DIM}  Frontend: http://localhost:${FRONTEND_PORT}${NC}"
echo -e "${DIM}  Backend:  http://localhost:${BACKEND_PORT}${NC}"
echo -e "${DIM}  Logs:     ./dev logs-snapshot${NC}"
echo -e "${DIM}  Stop:     ./dev stop${NC}"
echo ""

# Create setup-complete marker
cat > .setup-complete << MARKER
# Setup completed successfully
# This file is created by setup.sh to indicate successful setup
# AI agents can check for this file to verify setup was run

timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
mode: silent
MARKER
