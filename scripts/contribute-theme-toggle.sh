#!/bin/bash

# Script to prepare theme toggle fix for contribution to upstream

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Preparing Theme Toggle Fix Contribution${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Check if upstream remote exists
if ! git remote | grep -q "^upstream$"; then
    echo -e "${YELLOW}⚠️  Upstream remote not found. Adding it...${NC}"
    git remote add upstream https://github.com/elastic/elastic-demo-starter.git
fi

# Fetch latest from upstream
echo -e "${BLUE}📥 Fetching latest from upstream...${NC}"
git fetch upstream

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch: ${CURRENT_BRANCH}${NC}"

# Ask if user wants to create a new branch
read -p "Create a new branch for this contribution? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BRANCH_NAME="fix/theme-toggle-context-mismatch"
    echo -e "${BLUE}Creating branch: ${BRANCH_NAME}${NC}"
    git checkout -b "$BRANCH_NAME"
else
    echo -e "${YELLOW}Using current branch: ${CURRENT_BRANCH}${NC}"
    BRANCH_NAME="$CURRENT_BRANCH"
fi

# Show the file that will be committed
echo ""
echo -e "${GREEN}File to contribute:${NC}"
echo "─────────────────────────────────────────────────"
git status --short | grep ThemeToggle || echo "No ThemeToggle.tsx found"

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo "1. Review the change:"
echo "   git diff frontend/src/components/layout/ThemeToggle.tsx"
echo ""
echo "2. Stage the fix:"
echo "   git add frontend/src/components/layout/ThemeToggle.tsx"
echo ""
echo "3. Commit:"
echo "   git commit -m \"fix: theme toggle not working due to context mismatch\""
echo ""
echo "4. Push and create PR:"
echo "   git push upstream ${BRANCH_NAME}"
echo "   # Then open PR on GitHub"
echo ""
echo -e "${GREEN}✅ Ready to contribute!${NC}"
echo ""
echo "See CONTRIBUTION_THEME_TOGGLE.md for full details."

