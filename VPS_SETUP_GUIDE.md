# 🚀 VPS Setup Guide voor CAS Service Portal

Deze guide helpt je bij het opzetten van je VPS voor het hosten van de CAS Service Portal.

## 📋 Vereisten

- Ubuntu 20.04 LTS of hoger
- Root toegang tot je VPS
- Minimum 2GB RAM
- Minimum 20GB opslag

## 🔧 Stap 1: Server Voorbereiden

### Update het systeem
```bash
sudo apt update && sudo apt upgrade -y
```

### Installeer basis tools
```bash
sudo apt install -y curl wget git unzip software-properties-common
```

## 🗄️ Stap 2: PostgreSQL Installeren

### Installeer PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
```

### Start PostgreSQL service
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Configureer PostgreSQL
```bash
# Wissel naar postgres gebruiker
sudo -u postgres psql

# Maak database en gebruiker aan
CREATE DATABASE cas_service_portal;
CREATE USER cas_user WITH ENCRYPTED PASSWORD 'jouw_veilige_wachtwoord_hier';
GRANT ALL PRIVILEGES ON DATABASE cas_service_portal TO cas_user;
\q
```

### Configureer PostgreSQL voor externe verbindingen (optioneel)
```bash
# Bewerk postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf
# Verander: #listen_addresses = 'localhost' naar: listen_addresses = '*'

# Bewerk pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Voeg toe: host all all 0.0.0.0/0 md5

# Herstart PostgreSQL
sudo systemctl restart postgresql
```

## 🟢 Stap 3: Node.js Installeren

### Installeer Node.js 18.x (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Controleer installatie
```bash
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

## 🌐 Stap 4: Nginx Installeren

### Installeer Nginx
```bash
sudo apt install -y nginx
```

### Start Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configureer firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## 🔐 Stap 5: SSL Certificaat (Optioneel maar aanbevolen)

### Installeer Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Verkrijg SSL certificaat
```bash
sudo certbot --nginx -d jouw-domein.com
```

## 📁 Stap 6: Project Deployment

### Maak project directory
```bash
sudo mkdir -p /var/www/cas-portal
cd /var/www/cas-portal
```

### Upload je project
```bash
# Optie 1: Via Git (aanbevolen)
sudo git clone https://github.com/jouw-username/CAS_Service_Portal.git .

# Optie 2: Via SCP/SFTP
# Upload je project bestanden naar /var/www/cas-portal/
```

### Maak het deployment script uitvoerbaar
```bash
sudo chmod +x deploy.sh
```

## ⚙️ Stap 7: Environment Configuratie

### Maak production environment bestanden
```bash
# Backend .env
cd /var/www/cas-portal/backend
sudo cp env.example .env
sudo nano .env
```

**Bewerk backend .env:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cas_service_portal
DB_USER=cas_user
DB_PASSWORD=jouw_database_wachtwoord

# JWT Configuration (genereer een veilige key!)
JWT_SECRET=jouw_zeer_veilige_jwt_secret_minimaal_32_karakters_lang

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://jouw-domein.com
ALLOWED_ORIGINS=https://jouw-domein.com,https://www.jouw-domein.com

# AI Configuration
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### Frontend .env
```bash
cd /var/www/cas-portal/frontend
sudo cp env.example .env
sudo nano .env
```

**Bewerk frontend .env:**
```env
# Backend API URL
REACT_APP_BACKEND_URL=https://jouw-domein.com
```

## 🚀 Stap 8: Applicatie Deployen

### Run het deployment script
```bash
cd /var/www/cas-portal
sudo ./deploy.sh
```

### Setup database
```bash
cd /var/www/cas-api
sudo -u www-data node scripts/setupDatabase.js
sudo -u www-data node scripts/createTestUsers.js
```

## 🔍 Stap 9: Verificatie

### Controleer services
```bash
# Controleer backend service
sudo systemctl status cas-service-portal

# Controleer Nginx
sudo systemctl status nginx

# Controleer PostgreSQL
sudo systemctl status postgresql
```

### Test de applicatie
```bash
# Test API health
curl http://localhost:3001/api/health

# Test frontend (via browser)
# Ga naar: http://jouw-server-ip of https://jouw-domein.com
```

## 📊 Stap 10: Monitoring & Logs

### Bekijk logs
```bash
# Backend logs
sudo journalctl -u cas-service-portal -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Setup log rotation
```bash
sudo nano /etc/logrotate.d/cas-service-portal
```

```
/var/log/cas-service-portal/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data www-data
}
```

## 🔧 Stap 11: Onderhoud

### Update applicatie
```bash
cd /var/www/cas-portal
sudo git pull origin main
sudo ./deploy.sh
```

### Database backup
```bash
# Maak backup
sudo -u postgres pg_dump cas_service_portal > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
sudo -u postgres psql cas_service_portal < backup_file.sql
```

## 🚨 Troubleshooting

### Veel voorkomende problemen:

1. **Service start niet:**
   ```bash
   sudo journalctl -u cas-service-portal -n 50
   ```

2. **Database verbinding mislukt:**
   ```bash
   sudo -u postgres psql -c "SELECT version();"
   ```

3. **Nginx configuratie fouten:**
   ```bash
   sudo nginx -t
   ```

4. **Port al in gebruik:**
   ```bash
   sudo netstat -tulpn | grep :3001
   ```

5. **Permissie problemen:**
   ```bash
   sudo chown -R www-data:www-data /var/www/cas-api
   sudo chown -R www-data:www-data /var/www/html
   ```

## 🔐 Beveiliging

### Basis beveiliging
```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Setup fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Database beveiliging
```bash
# Verander standaard PostgreSQL wachtwoorden
sudo -u postgres psql
ALTER USER postgres PASSWORD 'nieuw_veilig_wachtwoord';
\q
```

## 📞 Support

Als je problemen ondervindt:

1. Controleer de logs (zie monitoring sectie)
2. Controleer of alle services draaien
3. Controleer firewall instellingen
4. Controleer environment variabelen

## 🎉 Klaar!

Je CAS Service Portal zou nu moeten draaien op je VPS!

- **Frontend:** https://jouw-domein.com
- **API Health:** https://jouw-domein.com/api/health
- **Test accounts:** 
  - SAC: sac@test.com / test123
  - Admin: admin@test.com / test123
  - Viewer: viewer@test.com / test123 