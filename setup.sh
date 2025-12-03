#!/bin/bash

# Elastic Demo Starter - Setup Launcher
# Launches the interactive setup wizard

set -e

# Find Python
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Get the directory where this script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the interactive setup
exec $PYTHON "$SCRIPT_DIR/scripts/interactive_setup.py"
