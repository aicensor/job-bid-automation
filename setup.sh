#!/bin/bash
# ============================================================================
# Tailor Resume Generator — Ubuntu 22.04 Setup Script
# Run: chmod +x setup.sh && sudo ./setup.sh
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

APP_DIR="/opt/tailor-resume"
APP_USER="tailor"
REPO_URL="https://github.com/aicensor/job-bid-automation.git"
NODE_VERSION="20"
PORT=3000

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Tailor Resume Generator — Setup             ║"
echo "║  Ubuntu 22.04 VPS                            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Check root ──
if [ "$EUID" -ne 0 ]; then
  err "Please run as root: sudo ./setup.sh"
fi

# ── 1. System update ──
info "Updating system packages..."
apt update -qq && apt upgrade -y -qq
log "System updated"

# ── 2. Install Node.js 20 ──
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | tr -d v)" -ge "$NODE_VERSION" ]; then
  log "Node.js $(node -v) already installed"
else
  info "Installing Node.js ${NODE_VERSION}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - >/dev/null 2>&1
  apt install -y -qq nodejs
  log "Node.js $(node -v) installed"
fi

# ── 3. Install Chromium + dependencies (for Puppeteer PDF generation) ──
info "Installing Chromium and dependencies..."
apt install -y -qq \
  chromium-browser \
  ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
  libfontconfig1 libgbm1 libgcc-s1 libglib2.0-0 libgtk-3-0 \
  libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils \
  2>/dev/null || warn "Some Chromium deps may have failed (non-critical)"

CHROME_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome-stable 2>/dev/null || echo "")
if [ -n "$CHROME_PATH" ]; then
  log "Chrome found at: $CHROME_PATH"
else
  warn "Chromium not found — PDF generation may not work. Install manually."
  CHROME_PATH="/usr/bin/chromium-browser"
fi

# ── 4. Install Git ──
if ! command -v git &>/dev/null; then
  info "Installing Git..."
  apt install -y -qq git
fi
log "Git $(git --version | awk '{print $3}') ready"

# ── 5. Install PM2 ──
if ! command -v pm2 &>/dev/null; then
  info "Installing PM2..."
  npm install -g pm2 >/dev/null 2>&1
fi
log "PM2 $(pm2 -v) ready"

# ── 6. Create app user (non-root) ──
if id "$APP_USER" &>/dev/null; then
  log "User '$APP_USER' exists"
else
  info "Creating user '$APP_USER'..."
  useradd -m -s /bin/bash "$APP_USER"
  log "User '$APP_USER' created"
fi

# ── 7. Clone or update repo ──
if [ -d "$APP_DIR/.git" ]; then
  info "Updating existing repo..."
  cd "$APP_DIR"
  git pull --ff-only 2>/dev/null || warn "Git pull failed — manual merge may be needed"
  log "Repo updated"
else
  info "Cloning repo to $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  log "Repo cloned"
fi

cd "$APP_DIR"

# ── 8. Install Node dependencies ──
info "Installing Node dependencies (this may take a minute)..."
npm install --production=false 2>&1 | tail -3
log "Dependencies installed"

# ── 9. Create .env if not exists ──
if [ ! -f "$APP_DIR/.env" ]; then
  info "Creating .env from template..."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"

  # Add Puppeteer Chrome path
  echo "" >> "$APP_DIR/.env"
  echo "# Puppeteer Chrome path (auto-detected)" >> "$APP_DIR/.env"
  echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> "$APP_DIR/.env"

  warn "⚠️  Edit .env with your API keys: nano $APP_DIR/.env"
  echo ""
  echo "  Required keys:"
  echo "    NVIDIA_API_KEY        — https://build.nvidia.com (free)"
  echo "    GOOGLE_GEMINI_API_KEY — https://aistudio.google.com/apikey (free)"
  echo "    SERPER_API_KEY        — https://serper.dev (free 2500 queries)"
  echo "    LINKEDIN_LI_AT        — Browser cookies (your LinkedIn account)"
  echo "    LINKEDIN_JSESSIONID   — Browser cookies"
  echo ""
else
  # Ensure Puppeteer path is set
  if ! grep -q "PUPPETEER_EXECUTABLE_PATH" "$APP_DIR/.env"; then
    echo "" >> "$APP_DIR/.env"
    echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> "$APP_DIR/.env"
  fi
  log ".env already exists"
fi

# ── 10. Create data directories ──
mkdir -p "$APP_DIR/data/base-resume" "$APP_DIR/data/output"
log "Data directories ready"

# ── 11. Add swap if < 2GB RAM ──
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 2048 ] && [ ! -f /swapfile ]; then
  info "Adding 2GB swap (low RAM detected: ${TOTAL_MEM}MB)..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log "2GB swap added"
else
  log "Memory OK (${TOTAL_MEM}MB RAM)"
fi

# ── 12. Build ──
info "Building Next.js production bundle..."
npm run build 2>&1 | tail -5
log "Build complete"

# ── 13. Set permissions ──
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
log "Permissions set for user '$APP_USER'"

# ── 14. Setup PM2 ──
info "Configuring PM2..."

# Create PM2 ecosystem file
cat > "$APP_DIR/ecosystem.config.js" << 'PMEOF'
module.exports = {
  apps: [{
    name: 'tailor',
    script: 'npm',
    args: 'start',
    cwd: '/opt/tailor-resume',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1500M',
    restart_delay: 5000,
    max_restarts: 10,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/opt/tailor-resume/logs/error.log',
    out_file: '/opt/tailor-resume/logs/out.log',
    merge_logs: true,
  }],
};
PMEOF

mkdir -p "$APP_DIR/logs"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/logs"

# Start with PM2 as the app user
su - "$APP_USER" -c "cd $APP_DIR && pm2 start ecosystem.config.js && pm2 save"

# Auto-start PM2 on reboot
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" >/dev/null 2>&1 || true

log "PM2 configured and started"

# ── 15. Setup Nginx (optional) ──
read -p "$(echo -e ${CYAN})Install Nginx reverse proxy? (y/N): $(echo -e ${NC})" INSTALL_NGINX
if [[ "$INSTALL_NGINX" =~ ^[Yy]$ ]]; then
  apt install -y -qq nginx

  read -p "Enter your domain (or press Enter for IP-only): " DOMAIN
  SERVER_NAME="${DOMAIN:-_}"

  cat > /etc/nginx/sites-available/tailor << NGEOF
server {
    listen 80;
    server_name $SERVER_NAME;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # SSE support (job queue progress streaming)
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
NGEOF

  ln -sf /etc/nginx/sites-available/tailor /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null
  nginx -t && systemctl reload nginx
  log "Nginx configured"

  # SSL
  if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "_" ]; then
    read -p "$(echo -e ${CYAN})Setup SSL with Let's Encrypt? (y/N): $(echo -e ${NC})" INSTALL_SSL
    if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
      apt install -y -qq certbot python3-certbot-nginx
      certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || warn "Certbot failed — run manually: certbot --nginx -d $DOMAIN"
      log "SSL configured"
    fi
  fi
fi

# ── 16. Setup firewall ──
if command -v ufw &>/dev/null; then
  ufw allow ssh >/dev/null 2>&1
  ufw allow 80 >/dev/null 2>&1
  ufw allow 443 >/dev/null 2>&1
  ufw --force enable >/dev/null 2>&1
  log "Firewall configured (SSH, HTTP, HTTPS)"
fi

# ── Done ──
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Setup Complete!                             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  App directory:  $APP_DIR"
echo "  App user:       $APP_USER"
echo "  Port:           $PORT"
echo "  Chrome:         $CHROME_PATH"
echo ""

if [ ! -s "$APP_DIR/.env" ] || grep -q "your-key" "$APP_DIR/.env" 2>/dev/null; then
  echo -e "  ${YELLOW}⚠️  Next step: Edit .env with your API keys${NC}"
  echo "     nano $APP_DIR/.env"
  echo ""
fi

echo "  Useful commands:"
echo "    pm2 logs tailor          — View logs"
echo "    pm2 restart tailor       — Restart app"
echo "    pm2 status               — Check status"
echo "    nano $APP_DIR/.env       — Edit API keys"
echo ""
echo "  Update:"
echo "    cd $APP_DIR && git pull && npm install && npm run build && pm2 restart tailor"
echo ""

# Check if running
sleep 2
if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT" | grep -q "200"; then
  echo -e "  ${GREEN}✅ Server is running at http://127.0.0.1:$PORT${NC}"
else
  echo -e "  ${YELLOW}⚠️  Server may need .env configured before it starts properly${NC}"
  echo "     After editing .env, run: pm2 restart tailor"
fi
echo ""
