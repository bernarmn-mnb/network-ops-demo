#!/bin/bash

# Single-command installer for Elastic Demo Starter
# Usage: curl -sL https://raw.githubusercontent.com/elastic/elastic-demo-starter/main/create-demo.sh | bash

set -e

REPO_URL="https://github.com/elastic/elastic-demo-starter.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# ASCII Art
echo -e "
  ${BOLD}______ _           _   _       
 |  ____| |         | | (_)      
 | |__  | | __ _ ___| |_ _  ___  
 |  __| | |/ _\` / __| __| |/ __| 
 | |____| | (_| |__ \ |_| | (__  
 |______|_|\__,_|___/\__|_|\___| 
                                 
  Agent Demo Generator${NC}
"

# =============================================================================
# OS Detection
# =============================================================================
detect_os() {
    case "$(uname -s)" in
        Darwin*) OS="macos" ;;
        Linux*)  OS="linux" ;;
        MINGW*|CYGWIN*|MSYS*) OS="windows" ;;
        *) OS="unknown" ;;
    esac
    echo "$OS"
}

detect_linux_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian|pop|mint|elementary) echo "debian" ;;
            fedora|rhel|centos|rocky|alma) echo "redhat" ;;
            arch|manjaro) echo "arch" ;;
            *) echo "unknown" ;;
        esac
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo -e "${BLUE}Detected OS: $OS${NC}"

if [ "$OS" = "linux" ]; then
    DISTRO=$(detect_linux_distro)
    echo -e "${BLUE}Detected distro: $DISTRO${NC}"
fi

# =============================================================================
# Package Manager Detection & Installation
# =============================================================================
check_homebrew() {
    command -v brew &> /dev/null
}

install_homebrew() {
    print_info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to PATH for this session (Apple Silicon vs Intel)
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
}

# =============================================================================
# Python Installation (the critical bootstrap step)
# =============================================================================
check_python() {
    command -v python3 &> /dev/null
}

install_python() {
    echo ""
    print_warning "Python 3 is required but not installed."
    
    case "$OS" in
        macos)
            if ! check_homebrew; then
                echo -e "${BOLD}Homebrew is required to install Python on macOS.${NC}"
                read -p "Install Homebrew? [Y/n] " -r
                if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                    install_homebrew
                else
                    print_error "Cannot proceed without Homebrew."
                    echo "Please install Python manually: https://www.python.org/downloads/"
                    exit 1
                fi
            fi
            print_info "Installing Python via Homebrew..."
            brew install python@3
            ;;
        linux)
            case "$DISTRO" in
                debian)
                    print_info "Installing Python via apt..."
                    sudo apt update
                    sudo apt install -y python3 python3-venv python3-pip
                    ;;
                redhat)
                    print_info "Installing Python via dnf/yum..."
                    if command -v dnf &> /dev/null; then
                        sudo dnf install -y python3 python3-pip
                    else
                        sudo yum install -y python3 python3-pip
                    fi
                    ;;
                arch)
                    print_info "Installing Python via pacman..."
                    sudo pacman -S --noconfirm python python-pip
                    ;;
                *)
                    print_error "Unknown Linux distribution."
                    echo "Please install Python 3 manually and re-run this script."
                    exit 1
                    ;;
            esac
            ;;
        *)
            print_error "Cannot auto-install Python on this OS."
            echo "Please install Python 3 manually: https://www.python.org/downloads/"
            exit 1
            ;;
    esac
    
    # Verify installation
    if check_python; then
        print_success "Python installed successfully!"
    else
        print_error "Python installation failed."
        exit 1
    fi
}

# =============================================================================
# Git Check (needed to clone)
# =============================================================================
check_git() {
    command -v git &> /dev/null
}

install_git() {
    print_warning "Git is required but not installed."
    
    case "$OS" in
        macos)
            if check_homebrew; then
                print_info "Installing Git via Homebrew..."
                brew install git
            else
                print_info "Installing Xcode Command Line Tools (includes Git)..."
                xcode-select --install
            fi
            ;;
        linux)
            case "$DISTRO" in
                debian) sudo apt install -y git ;;
                redhat) sudo dnf install -y git || sudo yum install -y git ;;
                arch) sudo pacman -S --noconfirm git ;;
            esac
            ;;
    esac
}

# =============================================================================
# Main Script
# =============================================================================

# Step 1: Check/Install Git
echo ""
echo -e "${BOLD}[Step 1] Checking Git...${NC}"
if check_git; then
    print_success "Git found"
else
    read -p "Git is required. Install it? [Y/n] " -r
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        install_git
    else
        print_error "Cannot proceed without Git."
        exit 1
    fi
fi

# Step 2: Check/Install Python
echo ""
echo -e "${BOLD}[Step 2] Checking Python...${NC}"
if check_python; then
    print_success "Python found: $(python3 --version)"
else
    read -p "Python 3 is required. Install it? [Y/n] " -r
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        install_python
    else
        print_error "Cannot proceed without Python."
        exit 1
    fi
fi

# Step 3: Get project name
echo ""
echo -e "${BOLD}[Step 3] Project Setup${NC}"
PROJECT_NAME=${1:-}

if [ -z "$PROJECT_NAME" ]; then
    read -p "📁 Enter project name [elastic-demo]: " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-elastic-demo}
fi

echo ""
echo "🚀 Creating new Elastic Demo: $PROJECT_NAME"
echo "=================================================="

# Step 4: Clone Repository
if [ -d "$PROJECT_NAME" ]; then
    print_warning "Directory '$PROJECT_NAME' already exists."
    read -p "   Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    rm -rf "$PROJECT_NAME"
fi

echo "📥 Cloning template..."
git clone --depth 1 --recurse-submodules $REPO_URL $PROJECT_NAME
cd $PROJECT_NAME
rm -rf .git  # Detach from template history

# Re-initialize git
git init

# Re-add hive-mind as a submodule
echo "🔗 Re-linking Hive Mind submodule..."
git submodule add https://github.com/elastic/hive-mind.git hive-mind 2>/dev/null || true
git submodule update --init --recursive

# =============================================================================
# Step 5: GitHub Repository Setup (Optional)
# =============================================================================
echo ""
echo -e "${BOLD}[Step 5] GitHub Repository Setup${NC}"
echo ""
echo "Your demo is ready locally. Would you like to create a GitHub repo to:"
echo "  • Back up your customizations"
echo "  • Share with teammates"
echo "  • Deploy later"
echo ""

# Check if gh CLI is available and authenticated
if command -v gh &> /dev/null; then
    if gh auth status &> /dev/null 2>&1; then
        GH_READY=true
        GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "")
        print_success "GitHub CLI ready (logged in as ${GH_USER:-unknown})"
    else
        GH_READY=false
        print_warning "GitHub CLI installed but not authenticated"
    fi
else
    GH_READY=false
    print_info "GitHub CLI (gh) not installed"
fi

echo ""
echo -e "${BOLD}Options:${NC}"
echo "  1. Create a private GitHub repo now (recommended)"
echo "  2. Skip - I'll set up GitHub later"
echo "  3. Show me manual instructions"
echo ""

read -p "Select option [1-3]: " REPO_CHOICE
REPO_CHOICE="${REPO_CHOICE:-2}"

case "$REPO_CHOICE" in
    1)
        if [ "$GH_READY" = true ]; then
            echo ""
            read -p "Repository name [$PROJECT_NAME]: " REPO_NAME_INPUT
            REPO_NAME_INPUT="${REPO_NAME_INPUT:-$PROJECT_NAME}"
            
            echo ""
            echo "Creating private repository: ${GH_USER}/${REPO_NAME_INPUT}..."
            
            if gh repo create "$REPO_NAME_INPUT" --private --source=. --push 2>/dev/null; then
                print_success "Repository created and code pushed!"
                echo ""
                echo -e "   ${BLUE}View at: https://github.com/${GH_USER}/${REPO_NAME_INPUT}${NC}"
            else
                print_error "Failed to create repository"
                echo "   You can try manually: gh repo create $REPO_NAME_INPUT --private --source=. --push"
            fi
        else
            echo ""
            print_warning "GitHub CLI needs to be set up first."
            echo ""
            echo -e "${BOLD}To set up GitHub CLI:${NC}"
            echo ""
            if ! command -v gh &> /dev/null; then
                case "$(uname -s)" in
                    Darwin*) echo "   brew install gh" ;;
                    Linux*)  echo "   # See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md" ;;
                esac
                echo ""
            fi
            echo "   gh auth login"
            echo ""
            echo "Then run this to create your repo:"
            echo ""
            echo -e "   ${GREEN}gh repo create $PROJECT_NAME --private --source=. --push${NC}"
            echo ""
        fi
        ;;
    3)
        echo ""
        echo -e "${BOLD}Manual GitHub Setup:${NC}"
        echo ""
        echo "1. Go to https://github.com/new"
        echo "2. Create a new PRIVATE repository named: $PROJECT_NAME"
        echo "3. Don't initialize with README (you already have files)"
        echo "4. Run these commands:"
        echo ""
        echo -e "   ${GREEN}git remote add origin https://github.com/YOUR_USERNAME/$PROJECT_NAME.git${NC}"
        echo -e "   ${GREEN}git add .${NC}"
        echo -e "   ${GREEN}git commit -m \"Initial commit from elastic-demo-starter\"${NC}"
        echo -e "   ${GREEN}git branch -M main${NC}"
        echo -e "   ${GREEN}git push -u origin main${NC}"
        echo ""
        ;;
    *)
        print_info "Skipping GitHub setup - you can do this anytime later"
        echo ""
        echo "When ready, run:"
        echo -e "   ${GREEN}gh repo create $PROJECT_NAME --private --source=. --push${NC}"
        echo ""
        ;;
esac

# Step 6: Handover to Python Interactive Setup
# Python handles all remaining prerequisites (Node, Docker, Go, yarn, etc.)
echo ""
echo "⚙️  Starting Interactive Setup..."
echo "   (Python will handle remaining prerequisites)"
echo ""
python3 scripts/interactive_setup.py

# End of wrapper
