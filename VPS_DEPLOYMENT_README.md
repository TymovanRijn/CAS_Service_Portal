# 🚀 CAS Service Portal VPS Deployment Guide

This guide explains how to deploy the CAS Service Portal to your VPS using the automated deployment scripts.

## 📋 Prerequisites

Before running the deployment scripts, ensure you have:

- **Linux VPS** with root access
- **Node.js** (v18+) installed
- **Git** installed
- **PostgreSQL** (v13+) installed and configured
- **Web server** (Apache/Nginx) configured
- **Sudo privileges** for the deployment user

## 🔧 Installation

### 1. Clone the Repository

```bash
# Clone the repository to your VPS
sudo git clone https://github.com/TymovanRijn/CAS_Service_Portal.git /tmp/CAS_Service_Portal
cd /tmp/CAS_Service_Portal/CAS_Service_Portal

# Make scripts executable
sudo chmod +x deploy-vps.sh
sudo chmod +x backup-restore.sh
```

### 2. Run the Deployment Script

```bash
# Run the main deployment script
sudo ./deploy-vps.sh
```

## 📁 Script Overview

### `deploy-vps.sh` - Main Deployment Script

This script automates the entire deployment process:

1. **Git Pull** - Clones the latest code from GitHub
2. **Dependencies** - Installs frontend and backend dependencies
3. **Build** - Creates production build of the frontend
4. **Deploy** - Copies build files to web directory
5. **Database** - Optional database initialization
6. **Cleanup** - Removes temporary files

#### Features:
- ✅ **Automatic backup** of existing deployment
- ✅ **Error handling** with colored output
- ✅ **Database initialization** options
- ✅ **Permission management** (www-data user)
- ✅ **Cleanup** of temporary files

### `backup-restore.sh` - Backup & Restore Script

This script handles backup and restore operations:

#### Commands:
- `sudo ./backup-restore.sh backup` - Create a new backup
- `sudo ./backup-restore.sh list` - List available backups
- `sudo ./backup-restore.sh restore <backup_name>` - Restore from backup
- `sudo ./backup-restore.sh clean [keep_count]` - Clean old backups
- `sudo ./backup-restore.sh status` - Show deployment status

## 🗄️ Database Initialization

During deployment, you'll be prompted to choose database initialization:

1. **Initialize with test data** - Creates sample users, incidents, and knowledge base
2. **Initialize without test data** - Sets up database structure only
3. **Skip initialization** - Leaves database unchanged

### Database Scripts Used:
- `scripts/setupDatabase.js` - Creates database structure
- `scripts/createTestUsers.js` - Creates test users
- `scripts/createTestTenant.js` - Creates test tenant
- `scripts/createTestIncidents.js` - Creates sample incidents
- `scripts/createTestKnowledgeBase.js` - Creates sample knowledge base

## 🌐 Web Server Configuration

After deployment, configure your web server to serve from `/var/www/html/sac`:

### Apache Configuration Example:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/html/sac
    
    <Directory /var/www/html/sac>
        AllowOverride All
        Require all granted
    </Directory>
    
    # Handle React Router
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ /index.html [QSA,L]
</VirtualHost>
```

### Nginx Configuration Example:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html/sac;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔧 Backend Configuration

### 1. Environment Variables

Create `.env` file in the backend directory:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cas_service_portal
DB_USER=your_username
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# AI Integration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Server
PORT=3001
NODE_ENV=production
```

### 2. Start Backend Server

```bash
# Navigate to backend directory
cd /path/to/backend

# Install dependencies (if not done by deployment script)
sudo npm install

# Start the server
sudo npm start
```

### 3. Process Management (Optional)

For production, consider using PM2:

```bash
# Install PM2
sudo npm install -g pm2

# Start backend with PM2
cd /path/to/backend
sudo pm2 start index.js --name "cas-backend"

# Save PM2 configuration
sudo pm2 save
sudo pm2 startup
```

## 🔄 Backup & Restore

### Creating Backups

```bash
# Create a backup
sudo ./backup-restore.sh backup

# List available backups
sudo ./backup-restore.sh list

# Clean old backups (keep 5 most recent)
sudo ./backup-restore.sh clean 5
```

### Restoring Backups

```bash
# Restore from a specific backup
sudo ./backup-restore.sh restore sac_backup_20250130_143022
```

## 📊 Monitoring & Maintenance

### Check Deployment Status

```bash
# Check deployment status
sudo ./backup-restore.sh status
```

### Log Files

Monitor these log files for issues:
- `/var/log/apache2/error.log` (Apache)
- `/var/log/nginx/error.log` (Nginx)
- Backend application logs

### Regular Maintenance

1. **Update application**:
   ```bash
   sudo ./deploy-vps.sh
   ```

2. **Create backups**:
   ```bash
   sudo ./backup-restore.sh backup
   ```

3. **Clean old backups**:
   ```bash
   sudo ./backup-restore.sh clean 5
   ```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**:
   ```bash
   sudo chown -R www-data:www-data /var/www/html/sac
   sudo chmod -R 755 /var/www/html/sac
   ```

2. **Build Fails**:
   - Check Node.js version: `node --version`
   - Clear npm cache: `sudo npm cache clean --force`
   - Check disk space: `df -h`

3. **Database Connection Issues**:
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials in `.env`
   - Test connection: `psql -h localhost -U your_username -d cas_service_portal`

4. **Web Server Issues**:
   - Check web server status: `sudo systemctl status apache2` or `sudo systemctl status nginx`
   - Check configuration syntax
   - Review error logs

### Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Verify all prerequisites are met
3. Ensure proper file permissions
4. Test database connectivity
5. Verify web server configuration

## 📝 File Structure

After deployment, your VPS will have:

```
/var/www/html/sac/           # Frontend build files
├── index.html
├── static/
│   ├── css/
│   ├── js/
│   └── media/
└── ...

/var/www/html/sac_backups/   # Backup directory
├── sac_backup_20250130_143022/
├── sac_backup_20250130_150000/
└── latest -> sac_backup_20250130_150000/

/path/to/backend/            # Backend application
├── index.js
├── .env
├── package.json
└── ...
```

## 🎉 Success!

Once deployment is complete:

1. ✅ Frontend is accessible via web browser
2. ✅ Backend API is running on port 3001
3. ✅ Database is initialized and connected
4. ✅ PWA features are enabled
5. ✅ Backup system is configured

Your CAS Service Portal is now ready for production use! 🚀 