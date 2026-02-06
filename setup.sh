#!/bin/bash

# =============================================================================
# Elastic Demo Starter - Silent Foundation Builder
# =============================================================================
# Installs all prerequisites and dependencies, connects the OOTB shared cluster,
# starts servers, and tells the user what to do next.
#
# NO prompts. NO feature selection. NO credential gathering.
# Those are handled by the AI assistant after setup.
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

# =============================================================================
# Step 1: Check & install prerequisites
# =============================================================================

echo ""
echo -e "${BOLD}Elastic Demo Starter - Setup${NC}"
echo -e "${DIM}Silent foundation builder. No prompts, no questions.${NC}"
echo ""
echo -e "${BLUE}[1/5] Checking prerequisites${NC}"

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
echo -e "${BLUE}[2/5] Initializing project${NC}"

if [ -d "hive-mind" ] && [ ! -d "hive-mind/patterns" ]; then
    log_info "Initializing hive-mind submodule..."
    git submodule update --init --recursive > /dev/null 2>&1 && \
        log_ok "hive-mind submodule" || \
        log_warn "Could not init hive-mind submodule (AI assistance will be limited)"
elif [ -d "hive-mind/patterns" ]; then
    log_ok "hive-mind submodule"
else
    log_info "No hive-mind submodule (not a blocker)"
fi

# =============================================================================
# Step 3: Install dependencies
# =============================================================================

echo ""
echo -e "${BLUE}[3/5] Installing dependencies${NC}"

# --- Backend (Python via uv) ---
log_info "Backend dependencies (Python)..."
if command -v uv &> /dev/null; then
    (cd backend && uv sync > /dev/null 2>&1) && \
        log_ok "Backend dependencies (uv sync)" || \
        log_fail "Backend dependency install failed"
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
echo -e "${BLUE}[4/5] Configuring Elastic connection${NC}"

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
echo -e "${BLUE}[5/5] Starting servers${NC}"

log_info "Starting backend and frontend..."
./dev start 2>&1 | while IFS= read -r line; do
    echo -e "       ${DIM}${line}${NC}"
done

# Give servers a moment to start
sleep 2

# Read actual ports
BACKEND_PORT="8001"
FRONTEND_PORT="3000"
[ -f ".dev-pids/backend.port" ] && BACKEND_PORT=$(cat .dev-pids/backend.port)
[ -f ".dev-pids/frontend.port" ] && FRONTEND_PORT=$(cat .dev-pids/frontend.port)

# Quick health check
BACKEND_OK=false
FRONTEND_OK=false

if curl -s --max-time 3 "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    BACKEND_OK=true
fi
if curl -s --max-time 3 "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    FRONTEND_OK=true
fi

if [ "$BACKEND_OK" = true ]; then
    log_ok "Backend running on port $BACKEND_PORT"
else
    log_warn "Backend starting (may take a moment) on port $BACKEND_PORT"
fi

if [ "$FRONTEND_OK" = true ]; then
    log_ok "Frontend running on port $FRONTEND_PORT"
else
    log_warn "Frontend starting (may take a moment) on port $FRONTEND_PORT"
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
