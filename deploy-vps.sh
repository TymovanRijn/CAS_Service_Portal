#!/bin/bash

# CAS Service Portal VPS Deployment Script
# This script automates the deployment process for the VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/TymovanRijn/CAS_Service_Portal.git"
REPO_DIR="/tmp/CAS_Service_Portal"
BUILD_DIR="/tmp/CAS_Service_Portal/CAS_Service_Portal/frontend/build"
DEPLOY_DIR="/var/www/html/sac"
BACKUP_DIR="/var/www/html/sac_backup_$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🚀 CAS Service Portal VPS Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Step 1: Clean up any existing temp directory
print_info "Cleaning up temporary directory..."
if [ -d "$REPO_DIR" ]; then
    sudo rm -rf "$REPO_DIR"
    print_status "Removed existing temp directory"
fi

# Step 2: Clone the repository
print_info "Cloning repository from GitHub..."
sudo git clone "$REPO_URL" "$REPO_DIR"
if [ $? -eq 0 ]; then
    print_status "Repository cloned successfully"
else
    print_error "Failed to clone repository"
    exit 1
fi

# Step 3: Navigate to the project directory
cd "$REPO_DIR/CAS_Service_Portal"

# Step 4: Install frontend dependencies
print_info "Installing frontend dependencies..."
cd frontend
sudo npm install
if [ $? -eq 0 ]; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Step 5: Build the frontend
print_info "Building frontend application..."
sudo npm run build
if [ $? -eq 0 ]; then
    print_status "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Step 6: Create backup of current deployment
print_info "Creating backup of current deployment..."
if [ -d "$DEPLOY_DIR" ]; then
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$DEPLOY_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    print_status "Backup created at: $BACKUP_DIR"
else
    print_warning "No existing deployment found, skipping backup"
fi

# Step 7: Deploy the build
print_info "Deploying build to web directory..."
sudo mkdir -p "$DEPLOY_DIR"
sudo rm -rf "$DEPLOY_DIR"/*
sudo cp -r build/* "$DEPLOY_DIR/"
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"
print_status "Build deployed successfully"

# Step 8: Install backend dependencies
print_info "Installing backend dependencies..."
cd ../backend
sudo npm install
if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Step 9: Database initialization prompt
echo ""
print_info "Database initialization options:"
echo "1. Initialize database with test data"
echo "2. Initialize database without test data"
echo "3. Skip database initialization"
echo ""
read -p "Choose an option (1-3): " db_choice

case $db_choice in
    1)
        print_info "Initializing database with test data..."
        sudo node scripts/setupDatabase.js
        sudo node scripts/createTestUsers.js
        sudo node scripts/createTestTenant.js
        sudo node scripts/createTestIncidents.js
        sudo node scripts/createTestKnowledgeBase.js
        print_status "Database initialized with test data"
        ;;
    2)
        print_info "Initializing database without test data..."
        sudo node scripts/setupDatabase.js
        print_status "Database initialized without test data"
        ;;
    3)
        print_warning "Skipping database initialization"
        ;;
    *)
        print_error "Invalid choice, skipping database initialization"
        ;;
esac

# Step 10: Clean up
print_info "Cleaning up temporary files..."
sudo rm -rf "$REPO_DIR"
print_status "Temporary files cleaned up"

# Step 11: Final status
echo ""
print_status "🎉 Deployment completed successfully!"
echo ""
print_info "Deployment Summary:"
echo "  📁 Web files: $DEPLOY_DIR"
echo "  💾 Backup: $BACKUP_DIR"
echo "  🗄️  Database: Initialized (if chosen)"
echo ""
print_info "Next steps:"
echo "  1. Configure your web server (Apache/Nginx) to serve from $DEPLOY_DIR"
echo "  2. Set up environment variables for the backend"
echo "  3. Start the backend server"
echo "  4. Test the application"
echo ""
print_info "Backend server can be started with:"
echo "  cd /path/to/backend && sudo npm start"
echo ""
print_status "🚀 CAS Service Portal is ready for production!" 