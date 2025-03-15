#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Simple logging
log() { echo -e "${GREEN}✓ $1${NC}"; }
err() { echo -e "${RED}✗ $1${NC}"; }

# Check if backup directory provided
if [ -z "$1" ]; then
    err "Please provide backup directory name"
    echo "Usage: ./restore.sh backup_YYYYMMDD_HHMMSS"
    exit 1
fi

BACKUP_DIR="$1"

# Verify backup exists
if [ ! -d "$BACKUP_DIR" ]; then
    err "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Remove all symlinks first
find . -type l -delete

# Remove reorganized directories
rm -rf src/
rm -rf public/{css,js,assets}

# Restore from backup, excluding symlinks
rsync -av \
    --exclude=".git/" \
    --exclude="node_modules/" \
    --exclude="backup_*/" \
    --exclude=".DS_Store" \
    "$BACKUP_DIR/" .

log "Restored from backup: $BACKUP_DIR"