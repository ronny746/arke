#!/bin/bash
set -e

# ==========================================
# Next.js Staging Deployment Script
# ==========================================

APP_NAME="lmsnew-staging"
PORT=1201
HOST="0.0.0.0"
DOMAIN="staging.skdinstitute.com"
EMAIL="admin@skdinstitute.com"
ENV_FILE=".env.staging"

echo "========================================="
echo "🚀 Deploying Staging Application: $APP_NAME"
echo "🌍 Domain : $DOMAIN"
echo "📦 Port   : $PORT"
echo "========================================="

# =====================================================
# 1. Environment Check & Auto Creation
# =====================================================
echo ""
echo "📄 Checking $ENV_FILE..."

if [ -f "$ENV_FILE" ]; then
    echo "✅ $ENV_FILE already exists (preserving existing file, no overwrite)."
else
    echo "⚠️ $ENV_FILE not found. Creating default $ENV_FILE for Staging..."
    cat <<EOF > "$ENV_FILE"
PORT=$PORT
JWT_SECRET=supersecretstagingjwtkey
MONGODB_URI=mongodb+srv://geniusattechie:tF2Oe1CBjJVdL9xZ@cluster0.oxahl6y.mongodb.net/lms_staging?appName=Cluster0
NODE_ENV=staging
RECORDINGS_DIR=./recordings_staging
MEDIASOUP_MIN_PORT=45000
MEDIASOUP_MAX_PORT=49999
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=200.141.15.18
EOF
    echo "✅ Created $ENV_FILE with default Staging config (Database: lms_staging, Port: $PORT)."
fi

# =====================================================
# 2. Firewall Rules
# =====================================================
echo ""
echo "🛡 Configuring Firewall for port $PORT and Mediasoup WebRTC range 45000-49999..."

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
echo ""
echo "📦 Installing npm dependencies..."
npm install

# =====================================================
# 4. Build Application
# =====================================================
echo ""
echo "🏗 Building Next.js application..."
npm run build

# =====================================================
# 5. PM2 Installation Check
# =====================================================
if ! command -v pm2 >/dev/null 2>&1; then
    echo "Installing PM2 globally..."
    sudo npm install -g pm2
fi

# =====================================================
# 6. Start / Restart App in PM2
# =====================================================
echo ""
echo "🚀 Managing PM2 Process: $APP_NAME..."

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    echo "Deleting previous $APP_NAME instance..."
    pm2 delete "$APP_NAME"
fi

NODE_ENV=staging PORT=$PORT HOST=$HOST DOTENV_CONFIG_PATH=.env.staging pm2 start server.js --name "$APP_NAME"

pm2 save
pm2 startup | tail -1 | sudo bash || true

# =====================================================
# 7. Nginx Installation Check
# =====================================================
if ! command -v nginx >/dev/null 2>&1; then
    echo "Installing Nginx..."
    sudo apt update
    sudo apt install nginx -y
fi

# =====================================================
# 8. Configure Nginx Proxy
# =====================================================
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

echo ""
echo "⚙️ Configuring Nginx reverse proxy for $DOMAIN..."

sudo tee "$NGINX_CONF" >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 100m;

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

echo "Testing Nginx syntax..."
sudo nginx -t

sudo systemctl restart nginx
sudo systemctl enable nginx

# =====================================================
# 9. SSL Certificate (Certbot)
# =====================================================
echo ""
echo "🔒 Checking SSL Certificate..."

if ! command -v certbot >/dev/null 2>&1; then
    echo "Installing Certbot..."
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
fi

sudo certbot \
    --nginx \
    -d "$DOMAIN" \
    --agree-tos \
    --redirect \
    --non-interactive \
    -m "$EMAIL" || echo "⚠️ SSL generation skipped (Ensure DNS A-record points to this server IP)."

# =====================================================
# 10. Status & Final Summary
# =====================================================
echo ""
echo "=============================================="
echo "🎉 Staging Deployment Completed Successfully!"
echo "=============================================="
echo ""
echo "Application Name : $APP_NAME"
echo "Staging Port     : $PORT"
echo "Direct Access    : http://200.141.15.18:$PORT"
echo "Staging URL      : https://$DOMAIN"
echo ""

echo "PM2 Status:"
pm2 status

echo ""
echo "Listening Ports:"
sudo ss -tulpn | grep ":$PORT" || true
