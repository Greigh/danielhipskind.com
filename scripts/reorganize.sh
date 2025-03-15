#!/bin/bash

# Exit on error and undefined variables
set -eu

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Log helper functions
log_success() { echo -e "${GREEN}✓ $1${NC}"; }
log_error() { echo -e "${RED}✗ $1${NC}"; }
log_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# Verify we're in the correct directory
if [ ! -f "package.json" ]; then
    log_error "Must run from project root directory"
    exit 1
fi

# Create backup (excluding existing backups)
backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
log_info "Creating backup in $backup_dir..."
mkdir -p "$backup_dir"
rsync -av --exclude="backup_*" --exclude="node_modules" . "$backup_dir/"
log_success "Created full backup"

# Create new directory structure
log_info "Creating new directory structure..."
dirs=(
    # Source directories
    "src/pages/privacy"
    "src/js/core"
    "src/js/analytics"
    "src/js/managers"
    "src/js/utils"
    "src/js/components"
    "src/css/base"
    "src/css/components"
    "src/css/pages"
    "src/assets/images"
    "src/assets/icons"
    "src/assets/fonts"

    # Public directories
    "public/assets"
    "public/js"
    "public/css"

    # Config and documentation
    "config"
    "docs"
    "tests/unit"
    "tests/integration"
    "tests/e2e"
    "scripts/deploy"
    "scripts/build"
)

for dir in "${dirs[@]}"; do
    mkdir -p "$dir" && log_success "Created $dir"
done

# Move files function
move_files() {
    local source=$1
    local dest=$2
    if [ -e "$source" ]; then
        mv "$source" "$dest" && log_success "Moved $source to $dest"
    else
        log_error "Source not found: $source"
        return 0 # Continue script
    fi
}

log_info "Moving files to new structure..."

# Move HTML files
move_files "html/index.html" "src/pages/"
move_files "html/analytics/opt-out.html" "src/pages/privacy/"

# Move JavaScript files
js_files=(
    "html/assets/js/config.js:src/js/core/"
    "html/assets/js/theme.js:src/js/core/"
    "html/assets/js/cacheManager.js:src/js/core/"
    "html/analytics/js/auth.js:src/js/analytics/"
    "html/assets/js/privacy.js:src/js/analytics/"
    "html/assets/js/index.js:src/js/"
)

for file in "${js_files[@]}"; do
    IFS=':' read -r source dest <<< "$file"
    move_files "$source" "$dest"
done

# Move manager files
for manager in project skill icon content observer; do
    move_files "html/assets/js/${manager}Manager.js" "src/js/managers/"
done

# Move CSS files
css_files=(
    "html/assets/css/style.css:src/css/base/"
    "html/assets/css/media-queries.css:src/css/base/"
    "html/assets/css/opt-out.css:src/css/pages/"
)

for file in "${css_files[@]}"; do
    IFS=':' read -r source dest <<< "$file"
    move_files "$source" "$dest"
done

# Move assets
log_info "Moving assets..."
if [ -d "html/assets/images" ]; then
    mv html/assets/images/* src/assets/images/ 2>/dev/null || true
    log_success "Moved images"
fi

if [ -d "html/assets/icons" ]; then
    mv html/assets/icons/* src/assets/icons/ 2>/dev/null || true
    log_success "Moved icons"
fi

# Move config files
move_files "serve.json" "config/"

# Create symlinks
log_info "Creating symlinks..."
symlinks=(
    "html/assets/js:../../src/js"
    "html/assets/css:../../src/css"
    "html/assets/images:../../src/assets/images"
    "html/assets/icons:../../src/assets/icons"
    "public/js:../src/js"
    "public/css:../src/css"
    "public/assets:../src/assets"
)

for link in "${symlinks[@]}"; do
    IFS=':' read -r target source <<< "$link"
    if [ -L "$target" ]; then
        rm "$target"
    fi
    mkdir -p "$(dirname "$target")"
    ln -s "$source" "$target" && log_success "Created symlink: $target -> $source"
done

# Create documentation files
log_info "Creating documentation..."
docs=(
    "docs/README.md:# Project Documentation"
    "docs/ARCHITECTURE.md:# Project Architecture"
    "docs/COMPONENTS.md:# Components Guide"
    "docs/ANALYTICS.md:# Analytics Implementation"
)

for doc in "${docs[@]}"; do
    IFS=':' read -r file content <<< "$doc"
    if [ ! -f "$file" ]; then
        echo "$content" > "$file"
        log_success "Created $file"
    fi
done

# Cleanup
log_info "Cleaning up empty directories..."
find html/assets -type d -empty -delete

log_success "Reorganization complete!"
log_info "Backup created in: $backup_dir"
log_info "You can restore from backup with: cp -r $backup_dir/* ."