#!/bin/bash

# =============================================================================
# Elastic Demo Starter - Pre-flight Check
# =============================================================================
# Run this AFTER cloning but BEFORE ./setup.sh to verify your environment.
#
# Usage:
#   ./preflight-check.sh
#
# This will check for required tools (Python, Node, Git) and recommend
# optional tools that improve the experience (GitHub CLI, Yarn, etc.)
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║      Elastic Demo Starter - Pre-flight Check               ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

mandatory_errors=0
recommended_warnings=0

# =============================================================================
# MANDATORY PREREQUISITES
# =============================================================================
echo -e "${CYAN}${BOLD}Mandatory Prerequisites${NC}"
echo -e "${DIM}These are required - setup will fail without them${NC}"
echo ""

# -----------------------------------------------------------------------------
# Python 3.8+
# -----------------------------------------------------------------------------
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
    
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 8 ]; then
        echo -e "  ${GREEN}✅ Python $PY_VERSION${NC}"
    else
        echo -e "  ${RED}❌ Python $PY_VERSION (need 3.8+)${NC}"
        echo -e "     ${DIM}Install: https://www.python.org/downloads/${NC}"
        mandatory_errors=$((mandatory_errors + 1))
    fi
elif command -v python &> /dev/null; then
    PY_VERSION=$(python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    
    if [ "$PY_MAJOR" -ge 3 ]; then
        PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
        if [ "$PY_MINOR" -ge 8 ]; then
            echo -e "  ${GREEN}✅ Python $PY_VERSION${NC}"
        else
            echo -e "  ${RED}❌ Python $PY_VERSION (need 3.8+)${NC}"
            mandatory_errors=$((mandatory_errors + 1))
        fi
    else
        echo -e "  ${RED}❌ Python 2.x detected (need Python 3.8+)${NC}"
        mandatory_errors=$((mandatory_errors + 1))
    fi
else
    echo -e "  ${RED}❌ Python not found${NC}"
    echo -e "     ${DIM}Install: https://www.python.org/downloads/${NC}"
    echo -e "     ${DIM}macOS: brew install python3${NC}"
    mandatory_errors=$((mandatory_errors + 1))
fi

# -----------------------------------------------------------------------------
# Node.js 18+
# -----------------------------------------------------------------------------
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  ${GREEN}✅ Node.js $NODE_VERSION${NC}"
    else
        echo -e "  ${RED}❌ Node.js $NODE_VERSION (need 18+)${NC}"
        echo -e "     ${DIM}Install: https://nodejs.org/${NC}"
        mandatory_errors=$((mandatory_errors + 1))
    fi
else
    echo -e "  ${RED}❌ Node.js not found${NC}"
    echo -e "     ${DIM}Install: https://nodejs.org/${NC}"
    echo -e "     ${DIM}macOS: brew install node${NC}"
    mandatory_errors=$((mandatory_errors + 1))
fi

# -----------------------------------------------------------------------------
# Git
# -----------------------------------------------------------------------------
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "  ${GREEN}✅ Git $GIT_VERSION${NC}"
else
    echo -e "  ${RED}❌ Git not found${NC}"
    echo -e "     ${DIM}Install: https://git-scm.com/downloads${NC}"
    echo -e "     ${DIM}macOS: xcode-select --install${NC}"
    mandatory_errors=$((mandatory_errors + 1))
fi

echo ""

# =============================================================================
# RECOMMENDED TOOLS
# =============================================================================
echo -e "${CYAN}${BOLD}Recommended Tools${NC}"
echo -e "${DIM}Not required, but significantly improve the experience${NC}"
echo ""

# -----------------------------------------------------------------------------
# GitHub CLI (gh)
# -----------------------------------------------------------------------------
if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version | head -1 | cut -d' ' -f3)
    echo -e "  ${GREEN}✅ GitHub CLI $GH_VERSION${NC}"
    
    # Check if authenticated
    if gh auth status &> /dev/null; then
        echo -e "     ${DIM}└─ Authenticated ✓${NC}"
    else
        echo -e "     ${YELLOW}└─ Not authenticated (run: gh auth login)${NC}"
        recommended_warnings=$((recommended_warnings + 1))
    fi
else
    echo -e "  ${YELLOW}⚠️  GitHub CLI not found${NC}"
    echo -e "     ${DIM}Makes cloning easier: gh repo clone elastic/elastic-demo-starter${NC}"
    echo -e "     ${DIM}Install: https://cli.github.com/${NC}"
    echo -e "     ${DIM}macOS: brew install gh${NC}"
    recommended_warnings=$((recommended_warnings + 1))
fi

# -----------------------------------------------------------------------------
# Yarn (faster than npm)
# -----------------------------------------------------------------------------
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    echo -e "  ${GREEN}✅ Yarn $YARN_VERSION${NC}"
else
    echo -e "  ${YELLOW}⚠️  Yarn not found (npm will be used)${NC}"
    echo -e "     ${DIM}Yarn is faster for installing frontend dependencies${NC}"
    echo -e "     ${DIM}Install: npm install -g yarn${NC}"
    recommended_warnings=$((recommended_warnings + 1))
fi

# -----------------------------------------------------------------------------
# Cursor IDE (for AI coding)
# -----------------------------------------------------------------------------
if [ -d "/Applications/Cursor.app" ] || command -v cursor &> /dev/null; then
    echo -e "  ${GREEN}✅ Cursor IDE${NC}"
else
    echo -e "  ${YELLOW}⚠️  Cursor IDE not detected${NC}"
    echo -e "     ${DIM}Recommended for AI-assisted coding${NC}"
    echo -e "     ${DIM}Install: https://cursor.sh/${NC}"
    recommended_warnings=$((recommended_warnings + 1))
fi

echo ""

# =============================================================================
# OPTIONAL ENHANCEMENTS
# =============================================================================
echo -e "${CYAN}${BOLD}Optional Enhancements${NC}"
echo -e "${DIM}Nice to have for specific features${NC}"
echo ""

# -----------------------------------------------------------------------------
# Firecrawl MCP (for AI branding extraction)
# -----------------------------------------------------------------------------
# Check if Firecrawl API key is set or MCP config exists
FIRECRAWL_CONFIGURED=false
if [ -n "$FIRECRAWL_API_KEY" ]; then
    FIRECRAWL_CONFIGURED=true
fi
# Check common MCP config locations
if [ -f "$HOME/.cursor/mcp.json" ]; then
    if grep -q "firecrawl" "$HOME/.cursor/mcp.json" 2>/dev/null; then
        FIRECRAWL_CONFIGURED=true
    fi
fi

if [ "$FIRECRAWL_CONFIGURED" = true ]; then
    echo -e "  ${GREEN}✅ Firecrawl MCP configured${NC}"
else
    echo -e "  ${DIM}○  Firecrawl MCP not configured${NC}"
    echo -e "     ${DIM}Enables AI to extract branding from websites${NC}"
    echo -e "     ${DIM}Setup: https://github.com/mendableai/firecrawl-mcp-server${NC}"
fi

# -----------------------------------------------------------------------------
# Beads (task tracking)
# -----------------------------------------------------------------------------
if command -v bd &> /dev/null; then
    echo -e "  ${GREEN}✅ Beads CLI (bd)${NC}"
else
    echo -e "  ${DIM}○  Beads CLI not installed${NC}"
    echo -e "     ${DIM}Local issue tracking for your project${NC}"
    echo -e "     ${DIM}Install: go install github.com/benbarten/beads/cmd/bd@latest${NC}"
fi

# -----------------------------------------------------------------------------
# jq (JSON processing)
# -----------------------------------------------------------------------------
if command -v jq &> /dev/null; then
    echo -e "  ${GREEN}✅ jq (JSON processor)${NC}"
else
    echo -e "  ${DIM}○  jq not installed${NC}"
    echo -e "     ${DIM}Useful for debugging API responses${NC}"
    echo -e "     ${DIM}macOS: brew install jq${NC}"
fi

echo ""

# =============================================================================
# NETWORK CONNECTIVITY
# =============================================================================
echo -e "${CYAN}${BOLD}Network Connectivity${NC}"
echo ""

# Check if we can reach Elastic Cloud
if curl -s --max-time 5 "https://cloud.elastic.co" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Can reach cloud.elastic.co${NC}"
else
    echo -e "  ${RED}❌ Cannot reach cloud.elastic.co${NC}"
    echo -e "     ${DIM}Check your network connection or proxy settings${NC}"
    mandatory_errors=$((mandatory_errors + 1))
fi

# Check npm registry
if curl -s --max-time 5 "https://registry.npmjs.org" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Can reach npm registry${NC}"
else
    echo -e "  ${YELLOW}⚠️  Cannot reach npm registry${NC}"
    echo -e "     ${DIM}Frontend dependency installation may fail${NC}"
    recommended_warnings=$((recommended_warnings + 1))
fi

# Check PyPI
if curl -s --max-time 5 "https://pypi.org" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✅ Can reach PyPI${NC}"
else
    echo -e "  ${YELLOW}⚠️  Cannot reach PyPI${NC}"
    echo -e "     ${DIM}Backend dependency installation may fail${NC}"
    recommended_warnings=$((recommended_warnings + 1))
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $mandatory_errors -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ All mandatory prerequisites met!${NC}"
    echo ""
    if [ $recommended_warnings -gt 0 ]; then
        echo -e "${YELLOW}$recommended_warnings recommended tool(s) missing${NC}"
        echo -e "${DIM}The setup will work, but consider installing them for a better experience.${NC}"
    fi
    echo ""
    echo -e "${BOLD}You're ready to run:${NC}"
    echo ""
    echo -e "  ${CYAN}gh repo clone elastic/elastic-demo-starter my-demo${NC}"
    echo -e "  ${CYAN}cd my-demo${NC}"
    echo -e "  ${CYAN}git submodule update --init --recursive${NC}"
    echo -e "  ${CYAN}./setup.sh${NC}"
    echo ""
else
    echo -e "${RED}${BOLD}❌ $mandatory_errors mandatory prerequisite(s) missing${NC}"
    echo ""
    echo -e "Please install the missing tools above before proceeding."
    echo -e "${DIM}Run this script again after installing to verify.${NC}"
    echo ""
    exit 1
fi
