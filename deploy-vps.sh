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
VPS_API_DIR="/var/www/cas-api"
SERVICE_NAME="cas-service-portal"

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

# Step 5: Configure frontend for VPS production
print_info "Configuring frontend for VPS production..."

# Create VPS production .env file
cat > .env << EOF
# VPS Production Configuration
REACT_APP_BACKEND_URL=https://sac.cas-nl.com
REACT_APP_API_URL=https://sac.cas-nl.com/api
EOF

print_status "Frontend .env configured for VPS production"

# Step 6: Build the frontend with VPS backend URL
print_info "Building frontend application for VPS..."
REACT_APP_BACKEND_URL="https://sac.cas-nl.com" \
REACT_APP_API_URL="https://sac.cas-nl.com/api" \
sudo npm run build

if [ $? -eq 0 ]; then
    print_status "Frontend build completed successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Step 7: Create backup of current deployment
print_info "Creating backup of current deployment..."
if [ -d "$DEPLOY_DIR" ]; then
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$DEPLOY_DIR"/* "$BACKUP_DIR/" 2>/dev/null || true
    print_status "Backup created at: $BACKUP_DIR"
else
    print_warning "No existing deployment found, skipping backup"
fi

# Step 8: Deploy the build
print_info "Deploying build to web directory..."
sudo mkdir -p "$DEPLOY_DIR"
sudo rm -rf "$DEPLOY_DIR"/*
sudo cp -r build/* "$DEPLOY_DIR/"
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"
print_status "Build deployed successfully to $DEPLOY_DIR"

# Step 9: Install backend dependencies
print_info "Installing backend dependencies..."
cd ../backend
sudo npm install
if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Step 10: Configure backend for VPS
print_info "Configuring backend for VPS production..."

# Create backend .env if it doesn't exist
if [ ! -f .env ]; then
    print_warning "No backend .env file found. Creating VPS production .env..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cas_service_portal
DB_USER=cas_user
DB_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_characters_long

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://sac.cas-nl.com
ALLOWED_ORIGINS=https://sac.cas-nl.com,https://www.sac.cas-nl.com

# AI Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
EOF
    print_warning "Please edit backend .env file with your actual database password and JWT secret!"
    print_warning "Make sure to set:"
    print_warning "  - DB_PASSWORD (secure database password)"
    print_warning "  - JWT_SECRET (secure JWT secret, minimum 32 characters)"
fi

# Step 11: Deploy backend to VPS
print_info "Deploying backend to VPS..."
sudo mkdir -p "$VPS_API_DIR"

# Use cp instead of rsync if rsync is not available
if command -v rsync &> /dev/null; then
    sudo rsync -av --exclude='node_modules' --exclude='.git' --exclude='uploads' ./ "$VPS_API_DIR/"
else
    print_warning "rsync not found, using cp instead..."
    sudo cp -r . "$VPS_API_DIR/"
    sudo rm -rf "$VPS_API_DIR/node_modules" "$VPS_API_DIR/.git" "$VPS_API_DIR/uploads" 2>/dev/null || true
fi

sudo chown -R www-data:www-data "$VPS_API_DIR"
sudo chmod -R 755 "$VPS_API_DIR"
print_status "Backend deployed to $VPS_API_DIR"

# Step 12: Create systemd service
print_info "Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=CAS Service Portal Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$VPS_API_DIR
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}
print_status "Service created and started"

# Step 13: Configure Nginx
print_info "Configuring Nginx for VPS..."
sudo tee /etc/nginx/sites-available/cas-service-portal > /dev/null <<EOF
server {
    listen 80;
    server_name sac.cas-nl.com www.sac.cas-nl.com;
    
    # Serve React app
    location / {
        root $DEPLOY_DIR;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Handle file uploads
    client_max_body_size 10M;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/cas-service-portal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
print_status "Nginx configured successfully"

# Step 14: Database initialization prompt
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
        cd "$VPS_API_DIR"
        sudo node scripts/setupDatabase.js
        sudo node scripts/createTestUsers.js
        sudo node scripts/createTestTenant.js
        sudo node scripts/createTestIncidents.js
        sudo node scripts/createTestKnowledgeBase.js
        print_status "Database initialized with test data"
        ;;
    2)
        print_info "Initializing database without test data..."
        cd "$VPS_API_DIR"
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

# Step 15: Clean up
print_info "Cleaning up temporary files..."
sudo rm -rf "$REPO_DIR"
print_status "Temporary files cleaned up"

# Step 16: Final status
echo ""
print_status "🎉 VPS Deployment completed successfully!"
echo ""
print_info "Deployment Summary:"
echo "  📁 Web files: $DEPLOY_DIR"
echo "  🔧 Backend API: $VPS_API_DIR"
echo "  💾 Backup: $BACKUP_DIR"
echo "  🗄️  Database: Initialized (if chosen)"
echo ""
print_info "Frontend Configuration:"
echo "  🌐 Backend URL: https://sac.cas-nl.com"
echo "  🔗 API URL: https://sac.cas-nl.com/api"
echo "  ✅ No more localhost:3001 issues!"
echo ""
print_info "Next steps:"
echo "  1. Configure your web server (Apache/Nginx) to serve from $DEPLOY_DIR"
echo "  2. Set up environment variables for the backend"
echo "  3. Start the backend server"
echo "  4. Test the application"
echo ""
print_info "Backend server can be started with:"
echo "  cd $VPS_API_DIR && sudo npm start"
echo ""
print_status "🚀 CAS Service Portal is ready for VPS production!" 