#!/bin/bash

# CAS Service Portal VPS Deployment Script
# This script builds and deploys the application specifically for VPS production

set -e  # Exit on any error

echo "🚀 Starting CAS Service Portal VPS Deployment..."

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

# Step 2: Configure frontend for VPS
print_status "Configuring frontend for VPS production..."
cd "../$FRONTEND_DIR"

# Create production .env file if it doesn't exist
if [ ! -f .env ]; then
    print_warning "No .env file found. Creating VPS production .env..."
    cat > .env << EOF
# VPS Production Configuration
REACT_APP_BACKEND_URL=https://sac.cas-nl.com
REACT_APP_API_URL=https://sac.cas-nl.com/api
EOF
    print_status "Created VPS production .env file"
fi

# Update .env with VPS settings
print_status "Updating .env with VPS production settings..."
cat > .env << EOF
# VPS Production Configuration
REACT_APP_BACKEND_URL=https://sac.cas-nl.com
REACT_APP_API_URL=https://sac.cas-nl.com/api
EOF

print_status "Frontend .env configured for VPS production"

# Step 3: Build frontend for VPS
print_status "Building frontend for VPS production..."

# Build with VPS backend URL
REACT_APP_BACKEND_URL="https://sac.cas-nl.com" \
REACT_APP_API_URL="https://sac.cas-nl.com/api" \
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    print_error "Build failed! Build directory not found."
    exit 1
fi

print_status "Frontend build completed successfully for VPS!"

# Step 4: Configure backend for VPS
print_status "Configuring backend for VPS production..."
cd "../$BACKEND_DIR"

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
    exit 1
fi

# Step 5: Deploy to VPS directories
print_status "Deploying to VPS directories..."

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

print_status "Frontend deployed to VPS successfully!"

# Step 6: Deploy backend to VPS
print_status "Deploying backend to VPS..."

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

print_status "Backend deployed to VPS successfully!"

# Step 7: Create systemd service
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

# Step 8: Configure Nginx
print_status "Configuring Nginx for VPS..."

sudo tee /etc/nginx/sites-available/cas-service-portal > /dev/null <<EOF
server {
    listen 80;
    server_name sac.cas-nl.com www.sac.cas-nl.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sac.cas-nl.com www.sac.cas-nl.com;
    
    # SSL Configuration (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/sac.cas-nl.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sac.cas-nl.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
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

print_status "Nginx configured successfully for VPS!"

# Step 9: Display final status
print_status "VPS Deployment completed successfully! 🎉"
print_status ""
print_status "Your application is now accessible at: https://sac.cas-nl.com"
print_status "API health check: https://sac.cas-nl.com/api/health"
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
print_status "Frontend now points to VPS backend: https://sac.cas-nl.com"
print_status "No more localhost:3001 issues! 🚀" 