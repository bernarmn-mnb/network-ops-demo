#!/bin/bash

# Script to identify reusable functionality that could be contributed back to template

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔍 Identifying Reusable Functionality${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Track what we find
REUSABLE_FILES=()
DEMO_SPECIFIC=()
POTENTIAL_REUSABLE=()

echo -e "${GREEN}✅ Likely Reusable (Generic Components)${NC}"
echo "─────────────────────────────────────────────────"

# Check for generic components
find frontend/src/components -type f -name "*.tsx" -o -name "*.ts" | while read file; do
    # Skip demo-specific directories
    if [[ "$file" == *"waitrose"* ]] || [[ "$file" == *"tesco"* ]] || [[ "$file" == *"branded"* ]]; then
        continue
    fi
    
    # Check for generic names
    filename=$(basename "$file")
    if [[ "$filename" == "ErrorBoundary"* ]] || \
       [[ "$filename" == "ThemeToggle"* ]] || \
       [[ "$filename" == "BrandSwitcher"* ]] || \
       [[ "$filename" == "QuickPrompts"* ]] || \
       [[ "$filename" == "EmptyState"* ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
        REUSABLE_FILES+=("$file")
    fi
done

echo ""
echo -e "${YELLOW}⚠️  Demo-Specific (Keep in Demo)${NC}"
echo "─────────────────────────────────────────────────"

# Find demo-specific code
find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.py" \) \
    ! -path "./node_modules/*" \
    ! -path "./venv/*" \
    ! -path "./.git/*" \
    ! -path "./dist/*" \
    ! -path "./hive-mind/*" | while read file; do
    # Check for demo-specific keywords
    if grep -qi "waitrose\|tesco\|demo-specific\|customer-specific" "$file" 2>/dev/null; then
        echo -e "  ${YELLOW}⚠${NC}  $file (contains demo-specific references)"
        DEMO_SPECIFIC+=("$file")
    fi
done

echo ""
echo -e "${BLUE}💡 Potential Reusable (Needs Review)${NC}"
echo "─────────────────────────────────────────────────"

# Check for new files that might be reusable
git status --porcelain | grep "^??" | awk '{print $2}' | while read file; do
    # Skip obvious demo files
    if [[ "$file" == *"waitrose"* ]] || \
       [[ "$file" == *"tesco"* ]] || \
       [[ "$file" == *".beads"* ]] || \
       [[ "$file" == *"dist"* ]]; then
        continue
    fi
    
    # Check file type
    if [[ "$file" == *.tsx ]] || [[ "$file" == *.ts ]] || [[ "$file" == *.py ]] || [[ "$file" == *.sh ]]; then
        echo -e "  ${BLUE}?${NC}  $file (new file, review for reusability)"
        POTENTIAL_REUSABLE+=("$file")
    fi
done

echo ""
echo -e "${GREEN}📚 Hive Mind Patterns (Always Contribute)${NC}"
echo "─────────────────────────────────────────────────"

# Check for new hive-mind patterns
if [ -d "hive-mind" ]; then
    cd hive-mind
    git status --porcelain 2>/dev/null | grep "^??\|^ M" | awk '{print $2}' | while read file; do
        if [[ "$file" == patterns/* ]] || [[ "$file" == troubleshooting/* ]]; then
            echo -e "  ${GREEN}✓${NC} hive-mind/$file (should be contributed)"
        fi
    done
    cd ..
fi

echo ""
echo -e "${BLUE}📋 Summary${NC}"
echo "─────────────────────────────────────────────────"
echo ""
echo "Next steps:"
echo "  1. Review files marked with ${GREEN}✓${NC} - these are likely reusable"
echo "  2. Review files marked with ${BLUE}?${NC} - check if they're generic enough"
echo "  3. Files marked with ${YELLOW}⚠${NC}  should stay demo-specific"
echo ""
echo "To contribute:"
echo "  - See CONTRIBUTING.md for the full workflow"
echo "  - Sanitize code (remove demo-specific references)"
echo "  - Test in isolation"
echo "  - Open PR to upstream repository"
echo ""

