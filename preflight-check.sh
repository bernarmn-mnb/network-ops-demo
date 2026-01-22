#!/bin/bash

# =============================================================================
# Elastic Demo Starter - Pre-flight Check (Interactive)
# =============================================================================
# Run this AFTER cloning but BEFORE ./setup.sh to verify your environment.
#
# Usage:
#   ./preflight-check.sh           # Interactive mode (prompts to install)
#   ./preflight-check.sh --check   # Check-only mode (no prompts)
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

# Mode: interactive or check-only
INTERACTIVE=true
if [ "$1" = "--check" ] || [ "$1" = "-c" ]; then
    INTERACTIVE=false
fi

# Counters
mandatory_errors=0
recommended_warnings=0
installed_count=0

# =============================================================================
# PLATFORM DETECTION
# =============================================================================
detect_platform() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
        if command -v brew &> /dev/null; then
            PKG_MANAGER="brew"
        else
            PKG_MANAGER="none"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        PLATFORM="linux"
        if command -v apt-get &> /dev/null; then
            PKG_MANAGER="apt"
        elif command -v yum &> /dev/null; then
            PKG_MANAGER="yum"
        elif command -v dnf &> /dev/null; then
            PKG_MANAGER="dnf"
        else
            PKG_MANAGER="none"
        fi
    else
        PLATFORM="unknown"
        PKG_MANAGER="none"
    fi
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Prompt user yes/no
prompt_yn() {
    local prompt="$1"
    local default="${2:-n}"
    
    if [ "$INTERACTIVE" = false ]; then
        return 1
    fi
    
    if [ "$default" = "y" ]; then
        read -p "$prompt [Y/n] " -n 1 -r choice
    else
        read -p "$prompt [y/N] " -n 1 -r choice
    fi
    echo ""
    
    case "$choice" in
        [Yy]) return 0 ;;
        [Nn]) return 1 ;;
        "") 
            if [ "$default" = "y" ]; then
                return 0
            else
                return 1
            fi
            ;;
        *) return 1 ;;
    esac
}

# Run install command with error handling
run_install() {
    local name="$1"
    local cmd="$2"
    
    echo -e "     ${CYAN}Installing $name...${NC}"
    echo -e "     ${DIM}Running: $cmd${NC}"
    echo ""
    
    if eval "$cmd"; then
        echo ""
        echo -e "     ${GREEN}✅ $name installed successfully!${NC}"
        installed_count=$((installed_count + 1))
        return 0
    else
        echo ""
        echo -e "     ${RED}❌ Installation failed. Please install manually.${NC}"
        return 1
    fi
}

# Install Homebrew (macOS)
install_homebrew() {
    echo -e "  ${YELLOW}Homebrew not found - it's needed to install other tools${NC}"
    if prompt_yn "  Install Homebrew?"; then
        echo ""
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add to PATH for this session
        if [ -f "/opt/homebrew/bin/brew" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [ -f "/usr/local/bin/brew" ]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        
        if command -v brew &> /dev/null; then
            PKG_MANAGER="brew"
            echo -e "  ${GREEN}✅ Homebrew installed!${NC}"
            return 0
        fi
    fi
    return 1
}

detect_platform

echo ""
echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║      Elastic Demo Starter - Pre-flight Check               ║${NC}"
echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Platform: $PLATFORM | Package manager: $PKG_MANAGER${NC}"
if [ "$INTERACTIVE" = true ]; then
    echo -e "${DIM}Mode: Interactive (will offer to install missing tools)${NC}"
else
    echo -e "${DIM}Mode: Check-only (use without --check for interactive mode)${NC}"
fi
echo ""

# Check for Homebrew on macOS first
if [ "$PLATFORM" = "macos" ] && [ "$PKG_MANAGER" = "none" ]; then
    install_homebrew
fi

# =============================================================================
# MANDATORY PREREQUISITES
# =============================================================================
echo -e "${CYAN}${BOLD}Mandatory Prerequisites${NC}"
echo -e "${DIM}These are required - setup will fail without them${NC}"
echo ""

# -----------------------------------------------------------------------------
# Python 3.8+
# -----------------------------------------------------------------------------
PYTHON_OK=false
if command -v python3 &> /dev/null; then
    PY_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
    
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 8 ]; then
        echo -e "  ${GREEN}✅ Python $PY_VERSION${NC}"
        PYTHON_OK=true
    else
        echo -e "  ${RED}❌ Python $PY_VERSION (need 3.8+)${NC}"
    fi
elif command -v python &> /dev/null; then
    PY_VERSION=$(python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
    PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
    
    if [ "$PY_MAJOR" -ge 3 ]; then
        PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
        if [ "$PY_MINOR" -ge 8 ]; then
            echo -e "  ${GREEN}✅ Python $PY_VERSION${NC}"
            PYTHON_OK=true
        else
            echo -e "  ${RED}❌ Python $PY_VERSION (need 3.8+)${NC}"
        fi
    else
        echo -e "  ${RED}❌ Python 2.x detected (need Python 3.8+)${NC}"
    fi
fi

if [ "$PYTHON_OK" = false ]; then
    if [ "$PKG_MANAGER" = "brew" ]; then
        if prompt_yn "  Install Python 3 via Homebrew?"; then
            if run_install "Python" "brew install python3"; then
                PYTHON_OK=true
            fi
        fi
    elif [ "$PKG_MANAGER" = "apt" ]; then
        if prompt_yn "  Install Python 3 via apt?"; then
            if run_install "Python" "sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip"; then
                PYTHON_OK=true
            fi
        fi
    else
        echo -e "     ${DIM}Install from: https://www.python.org/downloads/${NC}"
    fi
    
    if [ "$PYTHON_OK" = false ]; then
        mandatory_errors=$((mandatory_errors + 1))
    fi
fi

# -----------------------------------------------------------------------------
# Node.js 18+
# -----------------------------------------------------------------------------
NODE_OK=false
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  ${GREEN}✅ Node.js $NODE_VERSION${NC}"
        NODE_OK=true
    else
        echo -e "  ${RED}❌ Node.js $NODE_VERSION (need 18+)${NC}"
    fi
fi

if [ "$NODE_OK" = false ]; then
    if [ "$PKG_MANAGER" = "brew" ]; then
        if prompt_yn "  Install Node.js via Homebrew?"; then
            if run_install "Node.js" "brew install node"; then
                NODE_OK=true
            fi
        fi
    elif [ "$PKG_MANAGER" = "apt" ]; then
        echo -e "     ${DIM}For Node 18+, we recommend using NodeSource:${NC}"
        if prompt_yn "  Install Node.js 20 via NodeSource?"; then
            if run_install "Node.js" "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"; then
                NODE_OK=true
            fi
        fi
    else
        echo -e "     ${DIM}Install from: https://nodejs.org/${NC}"
    fi
    
    if [ "$NODE_OK" = false ]; then
        mandatory_errors=$((mandatory_errors + 1))
    fi
fi

# -----------------------------------------------------------------------------
# Git
# -----------------------------------------------------------------------------
GIT_OK=false
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "  ${GREEN}✅ Git $GIT_VERSION${NC}"
    GIT_OK=true
fi

if [ "$GIT_OK" = false ]; then
    if [ "$PLATFORM" = "macos" ]; then
        if prompt_yn "  Install Git via Xcode Command Line Tools?"; then
            if run_install "Git" "xcode-select --install"; then
                GIT_OK=true
            fi
        fi
    elif [ "$PKG_MANAGER" = "apt" ]; then
        if prompt_yn "  Install Git via apt?"; then
            if run_install "Git" "sudo apt-get update && sudo apt-get install -y git"; then
                GIT_OK=true
            fi
        fi
    else
        echo -e "     ${DIM}Install from: https://git-scm.com/downloads${NC}"
    fi
    
    if [ "$GIT_OK" = false ]; then
        mandatory_errors=$((mandatory_errors + 1))
    fi
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
        echo -e "     ${YELLOW}└─ Not authenticated${NC}"
        if prompt_yn "     Run 'gh auth login' now?"; then
            gh auth login
        fi
    fi
else
    echo -e "  ${YELLOW}⚠️  GitHub CLI not found${NC}"
    echo -e "     ${DIM}Makes cloning easier: gh repo clone elastic/elastic-demo-starter${NC}"
    
    if [ "$PKG_MANAGER" = "brew" ]; then
        if prompt_yn "  Install GitHub CLI via Homebrew?"; then
            run_install "GitHub CLI" "brew install gh"
        fi
    elif [ "$PKG_MANAGER" = "apt" ]; then
        if prompt_yn "  Install GitHub CLI via apt?"; then
            run_install "GitHub CLI" "curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && echo 'deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y"
        fi
    else
        echo -e "     ${DIM}Install: https://cli.github.com/${NC}"
    fi
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
    echo -e "     ${DIM}Yarn is 2-3x faster for installing frontend dependencies${NC}"
    
    if command -v npm &> /dev/null; then
        if prompt_yn "  Install Yarn via npm?"; then
            run_install "Yarn" "npm install -g yarn"
        fi
    fi
    recommended_warnings=$((recommended_warnings + 1))
fi

# -----------------------------------------------------------------------------
# Cursor IDE (for AI coding)
# -----------------------------------------------------------------------------
if [ -d "/Applications/Cursor.app" ] || command -v cursor &> /dev/null; then
    echo -e "  ${GREEN}✅ Cursor IDE${NC}"
else
    echo -e "  ${YELLOW}⚠️  Cursor IDE not detected${NC}"
    echo -e "     ${DIM}Recommended for AI-assisted \"vibe coding\"${NC}"
    echo -e "     ${DIM}Download: https://cursor.sh/${NC}"
    recommended_warnings=$((recommended_warnings + 1))
fi

# -----------------------------------------------------------------------------
# Beads (AI-friendly task tracking)
# https://github.com/steveyegge/beads
# -----------------------------------------------------------------------------
# Check common install locations for bd
BD_FOUND=false
BD_PATH=""

if command -v bd &> /dev/null; then
    BD_FOUND=true
    BD_PATH=$(which bd)
elif [ -x "/opt/homebrew/bin/bd" ]; then
    BD_FOUND=true
    BD_PATH="/opt/homebrew/bin/bd"
elif [ -x "/usr/local/bin/bd" ]; then
    BD_FOUND=true
    BD_PATH="/usr/local/bin/bd"
elif [ -x "$HOME/.local/bin/bd" ]; then
    BD_FOUND=true
    BD_PATH="$HOME/.local/bin/bd"
elif [ -x "$HOME/go/bin/bd" ]; then
    BD_FOUND=true
    BD_PATH="$HOME/go/bin/bd"
fi

if [ "$BD_FOUND" = true ]; then
    BD_VERSION=$("$BD_PATH" version 2>/dev/null | head -1 || echo "installed")
    echo -e "  ${GREEN}✅ Beads CLI (bd) $BD_VERSION${NC}"
    
    # Check if it's in PATH
    if ! command -v bd &> /dev/null; then
        echo -e "     ${YELLOW}Note: bd found at $BD_PATH but not in PATH${NC}"
        
        # Determine shell config file
        SHELL_CONFIG=""
        if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ]; then
            SHELL_CONFIG="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
            SHELL_CONFIG="$HOME/.bashrc"
        fi
        
        BD_DIR=$(dirname "$BD_PATH")
        echo -e "     ${DIM}Add to PATH by running:${NC}"
        echo -e "     ${CYAN}echo 'export PATH=\"$BD_DIR:\$PATH\"' >> $SHELL_CONFIG && source $SHELL_CONFIG${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠️  Beads CLI not installed${NC}"
    echo -e "     ${DIM}AI-friendly task tracking - helps agents manage complex work${NC}"
    
    # Offer installation options
    if prompt_yn "  Install Beads?"; then
        echo ""
        echo -e "     ${CYAN}Choose installation method:${NC}"
        echo -e "     ${DIM}1) Homebrew (recommended for macOS)${NC}"
        echo -e "     ${DIM}2) npm (cross-platform)${NC}"
        echo -e "     ${DIM}3) Install script${NC}"
        echo -e "     ${DIM}4) Skip${NC}"
        read -p "     Choice [1-4]: " -n 1 -r bd_choice
        echo ""
        
        BD_INSTALLED=false
        case "$bd_choice" in
            1)
                if run_install "Beads" "brew install steveyegge/beads/bd"; then
                    BD_INSTALLED=true
                fi
                ;;
            2)
                if run_install "Beads" "npm install -g @beads/bd"; then
                    BD_INSTALLED=true
                    # npm global installs may need PATH update
                    NPM_BIN=$(npm bin -g 2>/dev/null)
                    if [ -n "$NPM_BIN" ] && ! echo "$PATH" | grep -q "$NPM_BIN"; then
                        echo ""
                        echo -e "     ${YELLOW}Note: You may need to add npm global bin to PATH${NC}"
                        echo -e "     ${DIM}Add to PATH:${NC}"
                        echo -e "     ${CYAN}export PATH=\"$NPM_BIN:\$PATH\"${NC}"
                    fi
                fi
                ;;
            3)
                if run_install "Beads" "curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash"; then
                    BD_INSTALLED=true
                fi
                ;;
            *)
                echo -e "     ${DIM}Skipped. Install later: https://github.com/steveyegge/beads${NC}"
                ;;
        esac
        
        # Verify installation and provide PATH guidance
        if [ "$BD_INSTALLED" = true ]; then
            echo ""
            # Check if bd is now available
            if command -v bd &> /dev/null; then
                echo -e "     ${GREEN}✅ bd is ready to use!${NC}"
            else
                echo -e "     ${YELLOW}⚠️  bd installed but not in current PATH${NC}"
                echo ""
                echo -e "     ${DIM}To use bd in this terminal, run one of:${NC}"
                echo -e "     ${CYAN}source ~/.zshrc${NC}  (if using zsh)"
                echo -e "     ${CYAN}source ~/.bashrc${NC} (if using bash)"
                echo -e "     ${DIM}Or open a new terminal window.${NC}"
            fi
        fi
    else
        echo -e "     ${DIM}More info: https://github.com/steveyegge/beads${NC}"
    fi
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
FIRECRAWL_CONFIGURED=false
if [ -n "$FIRECRAWL_API_KEY" ]; then
    FIRECRAWL_CONFIGURED=true
fi
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
# Docker (for containerized deployment)
# -----------------------------------------------------------------------------
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo -e "  ${GREEN}✅ Docker $DOCKER_VERSION${NC}"
else
    echo -e "  ${DIM}○  Docker not installed${NC}"
    echo -e "     ${DIM}Required only for containerized deployment${NC}"
    echo -e "     ${DIM}Install: https://www.docker.com/products/docker-desktop${NC}"
fi

# -----------------------------------------------------------------------------
# jq (JSON processing)
# -----------------------------------------------------------------------------
if command -v jq &> /dev/null; then
    echo -e "  ${GREEN}✅ jq (JSON processor)${NC}"
else
    echo -e "  ${DIM}○  jq not installed${NC}"
    echo -e "     ${DIM}Useful for debugging API responses${NC}"
    
    if [ "$PKG_MANAGER" = "brew" ]; then
        if prompt_yn "  Install jq via Homebrew?"; then
            run_install "jq" "brew install jq"
        fi
    elif [ "$PKG_MANAGER" = "apt" ]; then
        if prompt_yn "  Install jq via apt?"; then
            run_install "jq" "sudo apt-get install -y jq"
        fi
    else
        echo -e "     ${DIM}macOS: brew install jq | Linux: apt install jq${NC}"
    fi
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
    echo -e "     ${YELLOW}Continuing with warning (manual verification required)${NC}"
    recommended_warnings=$((recommended_warnings + 1))
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

if [ $installed_count -gt 0 ]; then
    echo -e "${GREEN}${BOLD}📦 Installed $installed_count tool(s) during this run${NC}"
    echo ""
fi

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
    echo -e "  ${CYAN}./setup.sh${NC}"
    echo ""
    echo -e "${DIM}Or if you haven't cloned yet:${NC}"
    echo -e "  ${CYAN}git clone https://github.com/elastic/elastic-demo-starter.git my-demo${NC}"
    echo -e "  ${CYAN}cd my-demo${NC}"
    echo -e "  ${CYAN}git submodule update --init --recursive${NC}"
    echo -e "  ${CYAN}./setup.sh${NC}"
    echo ""
else
    echo -e "${RED}${BOLD}❌ $mandatory_errors mandatory prerequisite(s) missing${NC}"
    echo ""
    if [ "$INTERACTIVE" = true ]; then
        echo -e "Some required tools couldn't be installed automatically."
        echo -e "Please install them manually and run this script again."
    else
        echo -e "Run ${CYAN}./preflight-check.sh${NC} (without --check) for interactive installation."
    fi
    echo ""
    exit 1
fi
