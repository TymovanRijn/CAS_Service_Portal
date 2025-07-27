#!/bin/bash

# Deployment Readiness Check Script
# Controleert of alle benodigde bestanden en configuraties aanwezig zijn

echo "🔍 Checking deployment readiness..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((FAILED++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 directory exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 directory missing"
        ((FAILED++))
    fi
}

echo ""
echo "📁 Checking project structure..."
check_dir "frontend"
check_dir "backend"
check_file "deploy.sh"
check_file "VPS_SETUP_GUIDE.md"

echo ""
echo "📦 Checking package files..."
check_file "frontend/package.json"
check_file "backend/package.json"

echo ""
echo "⚙️ Checking configuration files..."
check_file "backend/env.example"
check_file "frontend/env.example"

echo ""
echo "🗄️ Checking database scripts..."
check_file "backend/scripts/setupDatabase.js"
check_file "backend/scripts/createTestUsers.js"

echo ""
echo "🚀 Checking main application files..."
check_file "backend/index.js"
check_file "frontend/src/App.tsx"
check_file "frontend/public/index.html"

echo ""
echo "🔧 Checking if deploy.sh is executable..."
if [ -x "deploy.sh" ]; then
    echo -e "${GREEN}✓${NC} deploy.sh is executable"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} deploy.sh is not executable"
    echo "  Run: chmod +x deploy.sh"
    ((FAILED++))
fi

echo ""
echo "📊 Summary:"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Upload project to your VPS"
    echo "2. Follow VPS_SETUP_GUIDE.md for server setup"
    echo "3. Configure environment files (.env)"
    echo "4. Run ./deploy.sh"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    exit 1
fi 