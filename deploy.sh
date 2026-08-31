#!/bin/bash
set -e

# ==========================================
# Next.js Production Deployment Script
# ==========================================

APP_NAME="lmsnew"
PORT=1200
HOST="0.0.0.0"
DOMAIN="skdinstitute.com"
EMAIL="admin@skdinstitute.com"    # Change if required

echo "========================================="
echo "🚀 Deploying $APP_NAME"
echo "🌍 Domain : $DOMAIN"
echo "📦 Port   : $PORT"
echo "========================================="

# =====================================================
# 1. Environment
# =====================================================
echo "📄 Checking .env..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env created from .env.example"
    else
        echo "❌ .env file not found."
        exit 1
    fi
else
    echo "✅ .env exists"
fi

# =====================================================
# 2. Firewall
# =====================================================
echo "🛡 Configuring Firewall for port $PORT and Mediasoup WebRTC ranges (20000-20100, 45000-49999)..."

if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow ${PORT}/tcp
    sudo ufw allow 20000:20100/udp
    sudo ufw allow 20000:20100/tcp
    sudo ufw allow 45000:49999/udp
    sudo ufw allow 45000:49999/tcp
    sudo ufw reload || true
fi

# =====================================================
# 3. Install Dependencies
# =====================================================
echo "📦 Installing dependencies..."
npm install

# =====================================================
# 4. Build
# =====================================================
echo "🏗 Building application..."
npm run build

# =====================================================
# 5. Install PM2
# =====================================================
if ! command -v pm2 >/dev/null 2>&1; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# =====================================================
# 6. Start / Restart App
# =====================================================
echo "🚀 Starting Application..."

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then

    pm2 delete "$APP_NAME"

fi

NODE_ENV=production PORT=$PORT HOST=$HOST MEDIASOUP_LISTEN_IP=0.0.0.0 MEDIASOUP_ANNOUNCED_IP=200.141.15.18 pm2 start server.js --name "$APP_NAME"

pm2 save

pm2 startup | tail -1 | sudo bash || true

# =====================================================
# 7. Install Nginx
# =====================================================
if ! command -v nginx >/dev/null 2>&1; then
    echo "Installing nginx..."
    sudo apt update
    sudo apt install nginx -y
fi

# =====================================================
# 8. Configure Nginx
# =====================================================

NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

echo "Creating nginx config..."

sudo tee "$NGINX_CONF" >/dev/null <<EOF
server {

    listen 80;

    server_name $DOMAIN www.$DOMAIN;

    client_max_body_size 10m;

    location / {

        proxy_pass http://127.0.0.1:$PORT;

        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_cache_bypass \$http_upgrade;

    }

}
EOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "Testing nginx..."

sudo nginx -t

sudo systemctl restart nginx
sudo systemctl enable nginx

# =====================================================
# 9. Install Certbot
# =====================================================
if ! command -v certbot >/dev/null 2>&1; then

    echo "Installing Certbot..."

    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y

fi

echo "Generating SSL Certificate..."

sudo certbot \
    --nginx \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --agree-tos \
    --redirect \
    --non-interactive \
    -m "$EMAIL" || echo "⚠ SSL generation skipped."

# =====================================================
# 10. Status
# =====================================================

echo ""
echo "=============================================="
echo "✅ Deployment Completed Successfully!"
echo "=============================================="

echo ""
echo "Application Name : $APP_NAME"
echo "Node Port        : $PORT"
echo "Direct Access    : http://200.141.15.18:$PORT"
echo "Domain           : http://$DOMAIN"
echo "HTTPS            : https://$DOMAIN"
echo ""

echo "PM2 Status"
pm2 status

echo ""
echo "Listening Ports"
sudo ss -tulpn | grep ":$PORT" || true

echo ""
echo "Nginx Status"
sudo systemctl status nginx --no-pager
