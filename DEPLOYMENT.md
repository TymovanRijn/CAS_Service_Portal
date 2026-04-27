# Production Deployment Guide

This project is deployed behind Apache on `https://sac.cas-nl.com`.

## 1) One-time server setup

1. Copy Apache template:
   - source: `deploy/apache-sac.conf.example`
   - target: `/etc/apache2/sites-available/sac.conf`
2. Copy systemd template:
   - source: `deploy/cas-service-portal.service.example`
   - target: `/etc/systemd/system/cas-service-portal.service`
3. Enable required Apache modules:
   - `proxy`
   - `proxy_http`
   - `rewrite`
   - `ssl`
4. Ensure SSL certificate paths in Apache config are valid.

## 2) Runtime env

```bash
cd backend
cp .env.example .env
```

Fill in at least:
- `JWT_SECRET`
- `DB_PASSWORD`

## 3) Deploy command

```bash
./scripts/deploy-production.sh
```

This script:
- builds frontend
- installs backend production dependencies
- creates backups in `/var/www/backups/cas`
- syncs new frontend/backend code
- restarts backend + apache
- runs post-deploy HTTP checks

## 4) Rollback (fast)

Pick a backup timestamp from:
- `/var/www/backups/cas/frontend`
- `/var/www/backups/cas/backend`

Restore:

```bash
sudo rsync -a --delete /var/www/backups/cas/frontend/<timestamp>/ /var/www/html/sac/
sudo rsync -a --delete /var/www/backups/cas/backend/<timestamp>/ /var/www/cas-api/
sudo systemctl restart cas-service-portal.service
sudo systemctl restart apache2
```
