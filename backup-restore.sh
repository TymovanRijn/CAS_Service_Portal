#!/bin/bash

# CAS Service Portal Backup & Restore Script
# This script handles backup and restore operations for the VPS deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/var/www/html/sac"
BACKUP_BASE="/var/www/html/sac_backups"

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

# Create backup directory if it doesn't exist
sudo mkdir -p "$BACKUP_BASE"

# Function to create backup
create_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="sac_backup_$timestamp"
    local backup_path="$BACKUP_BASE/$backup_name"
    
    print_info "Creating backup: $backup_name"
    
    if [ -d "$DEPLOY_DIR" ]; then
        sudo cp -r "$DEPLOY_DIR" "$backup_path"
        print_status "Backup created successfully at: $backup_path"
        
        # Create a symlink to the latest backup
        sudo rm -f "$BACKUP_BASE/latest"
        sudo ln -s "$backup_path" "$BACKUP_BASE/latest"
        print_status "Latest backup symlink updated"
    else
        print_warning "No deployment directory found at $DEPLOY_DIR"
    fi
}

# Function to list backups
list_backups() {
    print_info "Available backups:"
    echo ""
    
    if [ -d "$BACKUP_BASE" ]; then
        local backups=($(sudo ls -1t "$BACKUP_BASE" | grep "sac_backup_" | head -10))
        
        if [ ${#backups[@]} -eq 0 ]; then
            print_warning "No backups found"
        else
            for i in "${!backups[@]}"; do
                local backup_path="$BACKUP_BASE/${backups[$i]}"
                local backup_size=$(sudo du -sh "$backup_path" 2>/dev/null | cut -f1)
                local backup_date=$(sudo stat -c %y "$backup_path" 2>/dev/null | cut -d' ' -f1)
                echo "  $((i+1)). ${backups[$i]} (${backup_size}, ${backup_date})"
            done
        fi
    else
        print_warning "Backup directory not found"
    fi
}

# Function to restore backup
restore_backup() {
    local backup_name="$1"
    local backup_path="$BACKUP_BASE/$backup_name"
    
    if [ -z "$backup_name" ]; then
        print_error "Backup name is required"
        echo "Usage: $0 restore <backup_name>"
        exit 1
    fi
    
    if [ ! -d "$backup_path" ]; then
        print_error "Backup not found: $backup_path"
        exit 1
    fi
    
    print_info "Restoring backup: $backup_name"
    
    # Create backup of current deployment before restoring
    local current_backup="sac_current_$(date +%Y%m%d_%H%M%S)"
    if [ -d "$DEPLOY_DIR" ]; then
        sudo cp -r "$DEPLOY_DIR" "$BACKUP_BASE/$current_backup"
        print_status "Current deployment backed up as: $current_backup"
    fi
    
    # Remove current deployment
    sudo rm -rf "$DEPLOY_DIR"
    
    # Restore from backup
    sudo cp -r "$backup_path" "$DEPLOY_DIR"
    sudo chown -R www-data:www-data "$DEPLOY_DIR"
    sudo chmod -R 755 "$DEPLOY_DIR"
    
    print_status "Backup restored successfully"
}

# Function to clean old backups
clean_backups() {
    local keep_count="$1"
    
    if [ -z "$keep_count" ]; then
        keep_count=5
    fi
    
    print_info "Cleaning old backups (keeping $keep_count most recent)..."
    
    if [ -d "$BACKUP_BASE" ]; then
        local backups=($(sudo ls -1t "$BACKUP_BASE" | grep "sac_backup_"))
        
        if [ ${#backups[@]} -gt $keep_count ]; then
            local to_delete=(${backups[@]:$keep_count})
            
            for backup in "${to_delete[@]}"; do
                sudo rm -rf "$BACKUP_BASE/$backup"
                print_status "Deleted old backup: $backup"
            done
        else
            print_info "No old backups to clean"
        fi
    fi
}

# Main script logic
case "${1:-}" in
    "backup")
        create_backup
        ;;
    "list")
        list_backups
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "clean")
        clean_backups "$2"
        ;;
    "status")
        print_info "Deployment Status:"
        echo "  📁 Deployment directory: $DEPLOY_DIR"
        echo "  💾 Backup directory: $BACKUP_BASE"
        
        if [ -d "$DEPLOY_DIR" ]; then
            local deploy_size=$(sudo du -sh "$DEPLOY_DIR" 2>/dev/null | cut -f1)
            local deploy_files=$(sudo find "$DEPLOY_DIR" -type f | wc -l)
            echo "  📊 Deployment size: $deploy_size"
            echo "  📄 Files: $deploy_files"
        else
            print_warning "No deployment found"
        fi
        
        if [ -d "$BACKUP_BASE" ]; then
            local backup_count=$(sudo ls -1 "$BACKUP_BASE" | grep "sac_backup_" | wc -l)
            echo "  💾 Backups: $backup_count"
        fi
        ;;
    *)
        echo -e "${BLUE}🔧 CAS Service Portal Backup & Restore Script${NC}"
        echo -e "${BLUE}=============================================${NC}"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  backup                    Create a new backup"
        echo "  list                      List available backups"
        echo "  restore <backup_name>     Restore from a specific backup"
        echo "  clean [keep_count]        Clean old backups (default: keep 5)"
        echo "  status                    Show deployment status"
        echo ""
        echo "Examples:"
        echo "  sudo $0 backup"
        echo "  sudo $0 list"
        echo "  sudo $0 restore sac_backup_20250130_143022"
        echo "  sudo $0 clean 3"
        echo "  sudo $0 status"
        echo ""
        exit 1
        ;;
esac 