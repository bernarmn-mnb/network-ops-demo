#!/bin/bash

# Elastic Demo Starter - Setup Launcher
# Launches the interactive setup wizard
#
# Requires: uv (https://docs.astral.sh/uv/)
# uv manages Python versions and dependencies automatically.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Get the directory where this script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# =============================================================================
# Check for uv (required)
# =============================================================================

install_uv() {
    echo ""
    echo -e "${BLUE}Installing uv...${NC}"
    
    case "$(uname -s)" in
        Darwin|Linux)
            # macOS and Linux
            if curl -LsSf https://astral.sh/uv/install.sh | sh; then
                echo ""
                echo -e "${GREEN}✓ uv installed successfully${NC}"
                
                # Source the shell config to get uv in PATH
                # Try common locations
                if [ -f "$HOME/.cargo/env" ]; then
                    source "$HOME/.cargo/env"
                elif [ -f "$HOME/.local/bin/uv" ]; then
                    export PATH="$HOME/.local/bin:$PATH"
                fi
                
                # Verify it worked
                if command -v uv &> /dev/null; then
                    return 0
                else
                    echo -e "${YELLOW}Note: You may need to restart your terminal or run:${NC}"
                    echo '  source "$HOME/.cargo/env"'
                    echo ""
                    echo "Then run ./setup.sh again."
                    exit 0
                fi
            else
                echo -e "${RED}Failed to install uv${NC}"
                return 1
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            # Windows (Git Bash, etc.)
            echo "On Windows, please install uv manually:"
            echo ""
            echo "  PowerShell: irm https://astral.sh/uv/install.ps1 | iex"
            echo "  Or with winget: winget install astral-sh.uv"
            echo ""
            return 1
            ;;
        *)
            echo "Unknown OS. Please install uv manually:"
            echo "  https://docs.astral.sh/uv/getting-started/installation/"
            return 1
            ;;
    esac
}

if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}uv is required but not installed${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "uv is a fast Python package manager that handles dependencies"
    echo "and Python versions automatically."
    echo ""
    echo "Learn more: https://docs.astral.sh/uv/"
    echo ""
    
    # Check if we can auto-install
    if [ -t 0 ]; then
        # Interactive terminal - ask user
        read -p "Install uv now? [Y/n] " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo ""
            echo "Manual installation options:"
            echo "  • macOS/Linux: curl -LsSf https://astral.sh/uv/install.sh | sh"
            echo "  • macOS:       brew install uv"
            echo "  • Windows:     irm https://astral.sh/uv/install.ps1 | iex"
            echo ""
            exit 1
        fi
        
        if ! install_uv; then
            echo ""
            echo "Please install uv manually and run ./setup.sh again."
            exit 1
        fi
    else
        # Non-interactive - show instructions and exit
        echo "Install uv first:"
        echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
        echo ""
        echo "Then run ./setup.sh again."
        exit 1
    fi
fi

UV_VERSION=$(uv --version 2>/dev/null | head -1)
echo -e "${GREEN}✓${NC} $UV_VERSION"

# =============================================================================
# Run the interactive setup with uv
# =============================================================================

# uv run with a script path (not `uv run python script.py`) reads
# PEP 723 inline script metadata to install dependencies automatically.
# See: https://docs.astral.sh/uv/guides/scripts/

exec uv run "$SCRIPT_DIR/scripts/interactive_setup.py"
