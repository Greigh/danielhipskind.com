#!/bin/bash

# Daniel Hipskind Portfolio - Comprehensive Deployment Script

# Script directory - handle both direct execution and npm script execution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment configuration
if [ -f "$SCRIPT_DIR/.env.deploy" ]; then
    set -o allexport
    source "$SCRIPT_DIR/.env.deploy"
    set +o allexport
    # Explicitly export the key variables
    export SSH_USER SSH_HOST SSH_PASSWORD SSH_KEY
else
    echo "❌ .env.deploy file not found at: $SCRIPT_DIR/.env.deploy"
    echo "❌ Current directory: $(pwd)"
    echo "❌ Files in script dir: $(ls -la "$SCRIPT_DIR" | grep env)"
fi

# Default configuration
VPS_USER="${SSH_USER:-root}"
VPS_HOST="${SSH_HOST:-82.25.91.225}"
PROJECT_PATH="${PROJECT_PATH:-/var/www/danielhipskind.com}"
SSH_PASSWORD="${SSH_PASSWORD:-}"
SSH_KEY="${SSH_KEY:-}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_API_KEY="${CLOUDFLARE_API_KEY:-}"
CLOUDFLARE_EMAIL="${CLOUDFLARE_EMAIL:-}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
SUDO_PASSWORD="${SUDO_PASSWORD:-}"

# Cleanup function for temporary files
cleanup_temp_files() {
    rm -f "$SCRIPT_DIR"/deploy_htpasswd_helper_*.sh
    rm -f "$SCRIPT_DIR"/deploy_runner_*.sh
}

cleanup_ssh_agent() {
    if [ "${AGENT_STARTED:-0}" -eq 1 ]; then
        echo "🔐 Killing temporary ssh-agent"
        kill "$SSH_AGENT_PID" >/dev/null 2>&1 || true
    fi
}

echo "🧹 Cleaning up old deployment files..."
cleanup_temp_files
trap 'cleanup_temp_files; cleanup_ssh_agent' EXIT

# SSH authentication setup
setup_ssh_auth() {
    if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
        echo "🔐 Using SSH key authentication ($SSH_KEY)"

        # Add host to known_hosts if not present
        KNOWN_HOSTS="$SCRIPT_DIR/.known_hosts"
        if ! grep -q "$VPS_HOST" "$KNOWN_HOSTS" 2>/dev/null; then
            echo "🔐 Adding $VPS_HOST to known_hosts"
            ssh-keyscan -H "$VPS_HOST" >> "$KNOWN_HOSTS" 2>/dev/null || true
        fi

        # Start ssh-agent and add key
        if ! ssh-add -l >/dev/null 2>&1; then
            eval "$(ssh-agent -s)" >/dev/null 2>&1
            if ssh-add "$SSH_KEY" >/dev/null 2>&1; then
                export AGENT_STARTED=1
                SSH_CMD="ssh -o UserKnownHostsFile=$KNOWN_HOSTS"
                RSYNC_SSH="ssh -o UserKnownHostsFile=$KNOWN_HOSTS"
            else
                echo "❌ Failed to add SSH key to agent"
                return 1
            fi
        else
            SSH_CMD="ssh -o UserKnownHostsFile=$KNOWN_HOSTS"
            RSYNC_SSH="ssh -o UserKnownHostsFile=$KNOWN_HOSTS"
        fi
    elif [ -n "$SSH_PASSWORD" ]; then
        echo "🔐 Using password authentication"
        if ! command -v sshpass >/dev/null 2>&1; then
            echo "❌ sshpass not found. Install with: brew install hudochenkov/sshpass/sshpass"
            return 1
        fi
        # Use environment variable to avoid shell interpretation of special characters
        export SSHPASS="$SSH_PASSWORD"
        SSH_CMD="sshpass -e ssh"
        RSYNC_SSH="sshpass -e ssh"
    else
        echo "❌ No SSH authentication method configured"
        return 1
    fi
}

# Build Call Center Helper client
build_call_center() {
    echo "🏗️  Building Call Center Helper client..."
    cd "$SCRIPT_DIR/Call Center Help/client" || return 1

    if [ -f "package.json" ]; then
        npm install --include=dev || return 1
        npm run build || return 1
        # Restore local dependencies to keep dev server working
        echo "📦 Restoring local development dependencies..."
        npm install --include=dev

        echo "✅ Call Center Helper built successfully"
    else
        echo "⚠️  Call Center Helper package.json not found, skipping"
    fi

    cd "$SCRIPT_DIR" || return 1
}

# Build Next.js application
build_nextjs() {
    echo "🏗️  Building Next.js application..."
    npm install || return 1
    npm run build || return 1
    echo "✅ Next.js built successfully"
}

# Upload main website files
upload_website() {
    echo "📤 Uploading website files..."

    # Prepare rsync options
    RSYNC_OPTS="-az --exclude=node_modules --exclude=.git --exclude=logs --exclude=.env*"

    # Upload main files
    rsync $RSYNC_OPTS -e "$RSYNC_SSH" \
        --exclude="Call Center Help" \
        ./ "$VPS_USER@$VPS_HOST:$PROJECT_PATH/" || return 1

    echo "✅ Website files uploaded"
}

# Upload Call Center Helper files
upload_call_center() {
    echo "📤 Uploading Call Center Helper..."

    if [ -d "Call Center Help" ]; then
        # First, clean the destination directories
        $SSH_CMD "$VPS_USER@$VPS_HOST" "rm -rf $PROJECT_PATH/adamas/* $PROJECT_PATH/adamas/client/*" || true

        # Upload the built dist files to the web-accessible directory
        rsync -az -e "$RSYNC_SSH" \
            "Call Center Help/client/dist/" \
            "$VPS_USER@$VPS_HOST:$PROJECT_PATH/adamas/" || return 1

        # Also upload the client directory for server-side dependencies
        rsync -az -e "$RSYNC_SSH" \
            --exclude="dist" \
            --exclude="node_modules" \
            --exclude=".git" \
            "Call Center Help/client/" \
            "$VPS_USER@$VPS_HOST:$PROJECT_PATH/adamas/client/" || return 1
        echo "✅ Call Center Helper uploaded"
    else
        echo "⚠️  Call Center Help directory not found, skipping"
    fi
}

# Deploy nginx configurations
deploy_nginx() {
    echo "🌐 Deploying nginx configurations..."
    rsync -az -e "$RSYNC_SSH" \
        "$SCRIPT_DIR/nginx/" \
        "$VPS_USER@$VPS_HOST:/etc/nginx/sites-available/" || return 1

    # Reload nginx
    $SSH_CMD "$VPS_USER@$VPS_HOST" "nginx -t && systemctl reload nginx" || return 1
    echo "✅ Nginx configurations deployed and reloaded"
}

# Create backup before deployment
create_backup() {
    echo "💾 Creating pre-deployment backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    $SSH_CMD "$VPS_USER@$VPS_HOST" "cp -r $PROJECT_PATH $PROJECT_PATH.backup_$TIMESTAMP" || return 1
    echo "✅ Backup created: $PROJECT_PATH.backup_$TIMESTAMP"

    echo "🧹 Cleaning up backups older than 7 days..."
    $SSH_CMD "$VPS_USER@$VPS_HOST" "find $(dirname $PROJECT_PATH) -maxdepth 1 -name \"$(basename $PROJECT_PATH).backup_*\" -mtime +7 -exec echo \"🗑️  Deleting: {}\" \; -exec rm -rf {} \;" || true
}

# Install dependencies and restart application
restart_application() {
    echo "🔄 Installing dependencies and restarting application..."

    # For password auth, use a simpler approach - execute commands one by one
    if [ -n "$SSH_PASSWORD" ]; then
        echo "📦 Installing main dependencies..."
        if ! sshpass -p "$SSH_PASSWORD" ssh "$VPS_USER@$VPS_HOST" "cd /var/www/danielhipskind.com && npm install --omit=dev --silent"; then
            echo "❌ Failed to install main dependencies"
            return 1
        fi

        echo "📦 Installing Call Center Helper dependencies..."
        sshpass -p "$SSH_PASSWORD" ssh "$VPS_USER@$VPS_HOST" "cd /var/www/danielhipskind.com && [ -d 'adamas/client' ] && cd 'adamas/client' && npm install --omit=dev --silent" || true

        echo "🔄 Restarting application with PM2..."
        if sshpass -p "$SSH_PASSWORD" ssh "$VPS_USER@$VPS_HOST" "cd /var/www/danielhipskind.com && pm2 restart danielhipskind --update-env || pm2 start ecosystem.config.cjs && pm2 save" >/dev/null 2>&1; then
            echo "✅ Application restarted successfully"
        else
            echo "❌ Failed to restart application"
            return 1
        fi
    else
        # For key auth, use the original script approach
        RESTART_SCRIPT="restart_app_$(date +%s).sh"
        cat > "$RESTART_SCRIPT" << 'EOF'
#!/bin/bash
cd /var/www/danielhipskind.com

# Install main dependencies
npm install --omit=dev --silent

# Install Call Center Helper dependencies
if [ -d "adamas/client" ]; then
    cd "adamas/client"
    npm install --omit=dev --silent
    cd /var/www/danielhipskind.com
fi

# Restart with PM2
if command -v pm2 >/dev/null 2>&1; then
    pm2 restart danielhipskind --update-env || pm2 start ecosystem.config.cjs
    pm2 save
else
    echo "⚠️  PM2 not found, please restart manually"
fi
EOF

        # Upload and execute the script
        if rsync -e "$RSYNC_SSH" "$RESTART_SCRIPT" "$VPS_USER@$VPS_HOST:/tmp/" && \
           $SSH_CMD "$VPS_USER@$VPS_HOST" "chmod +x /tmp/$RESTART_SCRIPT && /tmp/$RESTART_SCRIPT && rm /tmp/$RESTART_SCRIPT"; then
            echo "✅ Application restarted successfully"
            rm -f "$RESTART_SCRIPT"
        else
            echo "❌ Failed to restart application"
            rm -f "$RESTART_SCRIPT"
            return 1
        fi
    fi
}

# Setup nginx basic authentication
setup_nginx_auth() {
    echo "🔐 Setting up nginx basic authentication..."

    if [ -z "$ADMIN_BASIC_USER" ] || [ -z "$ADMIN_BASIC_PASS" ]; then
        echo "⚠️  ADMIN_BASIC_USER or ADMIN_BASIC_PASS not set, skipping nginx auth setup"
        return 0
    fi

    # For password auth, execute commands directly
    if [ -n "$SSH_PASSWORD" ]; then
        if sshpass -p "$SSH_PASSWORD" ssh "$VPS_USER@$VPS_HOST" "echo '$ADMIN_BASIC_PASS' | htpasswd -ci /etc/nginx/.htpasswd '$ADMIN_BASIC_USER' && nginx -t && systemctl reload nginx"; then
            echo "✅ Nginx authentication configured"
        else
            echo "❌ Failed to configure nginx authentication"
            return 1
        fi
    else
        # For key auth, use script approach
        NGINX_SCRIPT="setup_nginx_$(date +%s).sh"
        cat > "$NGINX_SCRIPT" << EOF
#!/bin/bash
# Create .htpasswd file for admin area
echo '$ADMIN_BASIC_PASS' | htpasswd -ci /etc/nginx/.htpasswd '$ADMIN_BASIC_USER'

# Reload nginx to apply changes
nginx -t && systemctl reload nginx
EOF

        # Upload and execute the script
        if rsync -e "$RSYNC_SSH" "$NGINX_SCRIPT" "$VPS_USER@$VPS_HOST:/tmp/" && \
           $SSH_CMD "$VPS_USER@$VPS_HOST" "chmod +x /tmp/$NGINX_SCRIPT && /tmp/$NGINX_SCRIPT && rm /tmp/$NGINX_SCRIPT"; then
            echo "✅ Nginx authentication configured"
            rm -f "$NGINX_SCRIPT"
        else
            echo "❌ Failed to configure nginx authentication"
            rm -f "$NGINX_SCRIPT"
            return 1
        fi
    fi
}

# Verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."

    # Basic HTTP check with retry
    echo "Using retry logic for site verification..."
    for i in {1..5}; do
        if curl -sf "https://danielhipskind.com" >/dev/null; then
            echo "✅ Main site responding"
            break
        fi
        echo "⚠️  Site not yet responding, retrying in 2s ($i/5)..."
        sleep 2

        if [ $i -eq 5 ]; then
            echo "❌ Main site not responding after 5 attempts"
            return 1
        fi
    done

    # SSL certificate check
    if openssl s_client -connect danielhipskind.com:443 -servername danielhipskind.com < /dev/null 2>/dev/null | openssl x509 -noout -dates >/dev/null; then
        echo "✅ SSL certificate valid"
    else
        echo "❌ SSL certificate invalid or expired"
        return 1
    fi

    # Redis check
    if $SSH_CMD "$VPS_USER@$VPS_HOST" "redis-cli ping 2>/dev/null | grep -q PONG"; then
        echo "✅ Redis responding"
    else
        echo "⚠️  Redis not responding (sessions will use fallback mode)"
    fi

    # PM2 status
    if $SSH_CMD "$VPS_USER@$VPS_HOST" "pm2 status | grep -q online"; then
        echo "✅ Application running"
    else
        echo "❌ Application not running"
        return 1
    fi

    # Nginx configuration test
    if $SSH_CMD "$VPS_USER@$VPS_HOST" "nginx -t 2>/dev/null"; then
        echo "✅ Nginx configuration valid"
    else
        echo "❌ Nginx configuration invalid"
        return 1
    fi
}

# Purge Cloudflare cache
purge_cloudflare_cache() {
    if [ -z "$CLOUDFLARE_ZONE_ID" ]; then
        echo "⚠️  Cloudflare zone ID not configured, skipping cache purge"
        return 0
    fi

    # Check if we have API token (preferred method)
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        echo "🔄 Purging Cloudflare cache using API token..."
        CURL_HEADERS=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
    # Check if we have Global API Key (alternative method)
    elif [ -n "$CLOUDFLARE_EMAIL" ] && [ -n "$CLOUDFLARE_API_KEY" ]; then
        echo "🔄 Purging Cloudflare cache using Global API Key..."
        CURL_HEADERS=(-H "X-Auth-Email: $CLOUDFLARE_EMAIL" -H "X-Auth-Key: $CLOUDFLARE_API_KEY")
    else
        echo "⚠️  Cloudflare authentication not configured (need API_TOKEN or EMAIL+API_KEY), skipping cache purge"
        return 0
    fi

    # Purge entire cache and capture response
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
         "${CURL_HEADERS[@]}" \
         -H "Content-Type: application/json" \
         --data '{"purge_everything":true}')

    # Check if the response contains success
    if echo "$RESPONSE" | grep -q '"success"[[:space:]]*:[[:space:]]*true'; then
        echo "✅ Cloudflare cache purged successfully"
    else
        echo "❌ Failed to purge Cloudflare cache"
        echo "Response: $RESPONSE"
        echo "Check your Cloudflare credentials in .env.deploy"
        return 1
    fi
}

# Clear local DNS cache
clear_dns_cache() {
    echo "🧹 Clearing local DNS cache..."

    if [ -z "$SUDO_PASSWORD" ]; then
        echo "⚠️  SUDO_PASSWORD not set, attempting DNS cache clear without password (may prompt)"
        # Try without password first
        if sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder; then
            echo "✅ This computer's DNS cache cleared successfully"
        else
            echo "❌ Failed to clear DNS cache"
            return 1
        fi
    else
        echo "🔐 Using stored sudo password for DNS cache clearing..."
        # Use stored password with sudo -S
        if echo "$SUDO_PASSWORD" | sudo -S dscacheutil -flushcache && echo "$SUDO_PASSWORD" | sudo -S killall -HUP mDNSResponder; then
            echo "✅ This computer's DNS cache cleared successfully"
        else
            echo "❌ Failed to clear DNS cache"
            return 1
        fi
    fi
}

# Main deployment function
main() {
    echo "🚀 Starting deployment to $VPS_HOST..."

    # Setup authentication
    if ! setup_ssh_auth; then
        echo "❌ SSH authentication setup failed"
        exit 1
    fi

    # Create backup before deployment
    if ! create_backup; then
        echo "❌ Backup creation failed"
        exit 1
    fi

    # Build Call Center Helper
    if ! build_call_center; then
        echo "❌ Call Center Helper build failed"
        exit 1
    fi

    # Build Next.js
    if ! build_nextjs; then
        echo "❌ Next.js build failed"
        exit 1
    fi

    # Upload files
    if ! upload_website; then
        echo "❌ Website upload failed"
        exit 1
    fi

    if ! upload_call_center; then
        echo "❌ Call Center Helper upload failed"
        exit 1
    fi

    # Deploy nginx configurations
    if ! deploy_nginx; then
        echo "❌ Nginx deployment failed"
        exit 1
    fi

    # Restart application
    if ! restart_application; then
        echo "❌ Application restart failed"
        exit 1
    fi

    # Setup nginx authentication
    setup_nginx_auth

    # Verify deployment
    if ! verify_deployment; then
        echo "❌ Deployment verification failed"
        exit 1
    fi

    # Purge Cloudflare cache
    purge_cloudflare_cache

    # Clear local DNS cache
    clear_dns_cache

    echo ""
    echo "✅ Deployment completed successfully!"
    echo "🕒 Built on $(date "+%Y-%m-%d %H:%M:%S")"
    echo ""
    echo "🌐 Website: https://danielhipskind.com"
    echo "🛠️  Call Center: https://danielhipskind.com/adamas/"

    if [ -n "$ADMIN_BASIC_USER" ]; then
        echo "🔐 Admin: https://danielhipskind.com/admin/login.html"
    fi
}

# Run main deployment
main
