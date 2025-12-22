#!/bin/bash

# Quick script to check and configure git remotes for contribution workflow

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔗 Git Remote Configuration${NC}"
echo ""

# Check current remotes
echo -e "${GREEN}Current remotes:${NC}"
git remote -v
echo ""

# Check if upstream exists
if git remote | grep -q "^upstream$"; then
    echo -e "${GREEN}✅ Upstream remote configured${NC}"
else
    echo -e "${YELLOW}⚠️  Upstream remote not found${NC}"
    echo ""
    echo "To add upstream (template repo):"
    echo "  git remote add upstream https://github.com/elastic/elastic-demo-starter.git"
    echo ""
fi

# Check if origin points to template
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$ORIGIN_URL" == *"elastic-demo-starter"* ]]; then
    echo -e "${YELLOW}⚠️  Origin points to template repo${NC}"
    echo ""
    echo "If you want origin to point to your own repo:"
    echo "  1. Create a new repo on GitHub"
    echo "  2. Run: git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO.git"
    echo ""
    echo "Otherwise, you can use 'upstream' for contributing back."
else
    echo -e "${GREEN}✅ Origin points to your repo${NC}"
fi

echo ""
echo -e "${BLUE}Quick commands:${NC}"
echo "  git fetch upstream          # Get latest from template"
echo "  git remote -v                # View all remotes"
echo "  ./scripts/identify-reusable.sh  # Find reusable code"

