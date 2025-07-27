#!/bin/bash

# CAS Service Portal Deployment Script
# This script builds and deploys the application to VPS

set -e  # Exit on any error

echo "🚀 Starting CAS Service Portal Deployment..."

# Configuration
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"
BUILD_DIR="./frontend/build"
VPS_WEB_DIR="/var/www/html"
VPS_API_DIR="/var/www/cas-api"
SERVICE_NAME="cas-service-portal"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Step 1: Install dependencies
print_status "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install

print_status "Installing backend dependencies..."
cd "../$BACKEND_DIR"
npm install

# Step 2: Build frontend
print_status "Building frontend for production..."
cd "../$FRONTEND_DIR"

# Create production .env file if it doesn't exist
if [ ! -f .env ]; then
    print_warning "No .env file found. Creating one from env.example..."
    cp env.example .env
    print_warning "Please edit .env file with your production settings before running again!"
    exit 1
fi

# Build the React app
REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL:-"http://localhost:3001"} npm run build

if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed! Build directory not found."
    exit 1
fi

print_status "Frontend build completed successfully!"

# Step 3: Create backend .env if it doesn't exist
cd "../$BACKEND_DIR"
if [ ! -f .env ]; then
    print_warning "No backend .env file found. Creating one from env.example..."
    cp env.example .env
    print_warning "Please edit backend .env file with your production settings!"
    print_warning "Make sure to set:"
    print_warning "  - DB_PASSWORD (secure database password)"
    print_warning "  - JWT_SECRET (secure JWT secret, minimum 32 characters)"
    print_warning "  - FRONTEND_URL (your domain)"
    print_warning "  - ALLOWED_ORIGINS (your domain(s))"
    exit 1
fi

# Step 4: Copy files to web directory
print_status "Deploying frontend to $VPS_WEB_DIR..."

# Backup existing files
if [ -d "$VPS_WEB_DIR" ]; then
    sudo cp -r "$VPS_WEB_DIR" "$VPS_WEB_DIR.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi

# Create web directory if it doesn't exist
sudo mkdir -p "$VPS_WEB_DIR"

# Copy build files
sudo cp -r "../$BUILD_DIR"/* "$VPS_WEB_DIR/"

# Set proper permissions
sudo chown -R www-data:www-data "$VPS_WEB_DIR"
sudo chmod -R 755 "$VPS_WEB_DIR"

print_status "Frontend deployed successfully!"

# Step 5: Deploy backend
print_status "Deploying backend to $VPS_API_DIR..."

# Create API directory
sudo mkdir -p "$VPS_API_DIR"

# Copy backend files (excluding node_modules)
sudo rsync -av --exclude='node_modules' --exclude='.git' --exclude='uploads' ./ "$VPS_API_DIR/"

# Install production dependencies
cd "$VPS_API_DIR"
sudo npm install --production

# Create uploads directory with proper permissions
sudo mkdir -p "$VPS_API_DIR/uploads/incidents"
sudo mkdir -p "$VPS_API_DIR/uploads/reports"
sudo chown -R www-data:www-data "$VPS_API_DIR/uploads"
sudo chmod -R 755 "$VPS_API_DIR/uploads"

# Set proper permissions for backend
sudo chown -R www-data:www-data "$VPS_API_DIR"
sudo chmod -R 755 "$VPS_API_DIR"

print_status "Backend deployed successfully!"

# Step 6: Create systemd service
print_status "Creating systemd service..."

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

print_status "Service created and started!"

# Step 7: Configure Nginx (if available)
if command -v nginx &> /dev/null; then
    print_status "Configuring Nginx..."
    
    sudo tee /etc/nginx/sites-available/cas-service-portal > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Serve React app
    location / {
        root $VPS_WEB_DIR;
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
    
    print_status "Nginx configured successfully!"
else
    print_warning "Nginx not found. You'll need to configure your web server manually."
fi

# Step 8: Display status
print_status "Deployment completed successfully! 🎉"
print_status ""
print_status "Next steps:"
print_status "1. Make sure PostgreSQL is installed and running"
print_status "2. Create the database and run setup scripts:"
print_status "   cd $VPS_API_DIR && node scripts/setupDatabase.js"
print_status "3. Create test users:"
print_status "   cd $VPS_API_DIR && node scripts/createTestUsers.js"
print_status "4. Check service status:"
print_status "   sudo systemctl status ${SERVICE_NAME}"
print_status "5. View logs:"
print_status "   sudo journalctl -u ${SERVICE_NAME} -f"
print_status ""
print_status "Your application should now be accessible at: http://your-server-ip"
print_status "API health check: http://your-server-ip/api/health" 