#!/bin/bash

# Elastic Demo Starter - Setup Launcher
# Launches the interactive setup wizard

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Find Python
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo -e "${RED}❌ Python is not installed.${NC}"
    echo ""
    echo "Please install Python 3.8 or newer:"
    echo "  • macOS: brew install python3"
    echo "  • Ubuntu: sudo apt install python3 python3-venv"
    echo "  • Download: https://www.python.org/downloads/"
    echo ""
    echo "Then run ./setup.sh again."
    exit 1
fi

# Check Python version (need 3.8+)
PY_VERSION=$($PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null)
PY_MAJOR=$($PYTHON -c "import sys; print(sys.version_info.major)" 2>/dev/null)
PY_MINOR=$($PYTHON -c "import sys; print(sys.version_info.minor)" 2>/dev/null)

if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 8 ]); then
    echo -e "${RED}❌ Python $PY_VERSION is too old.${NC}"
    echo ""
    echo "This project requires Python 3.8 or newer."
    echo "Your version: Python $PY_VERSION"
    echo ""
    echo "Please upgrade Python:"
    echo "  • macOS: brew upgrade python3"
    echo "  • Ubuntu: sudo apt install python3.10"
    echo "  • Download: https://www.python.org/downloads/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Python $PY_VERSION"

# Get the directory where this script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the interactive setup
exec $PYTHON "$SCRIPT_DIR/scripts/interactive_setup.py"
