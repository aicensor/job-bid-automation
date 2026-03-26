# Deploy on Ubuntu 22.04 VPS

## 1. System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Node.js 20+ (required)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v  # should be v20+
npm -v

# Chrome/Chromium for Puppeteer PDF generation
sudo apt install -y chromium-browser
# OR install Google Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable

# Puppeteer dependencies (headless Chrome needs these)
sudo apt install -y \
  ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
  libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
  libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 \
  libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
  libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 \
  libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Git (for updates)
sudo apt install -y git
```

## 2. Clone & Install

```bash
# Clone the repo
cd /opt
git clone https://github.com/aicensor/job-bid-automation.git tailor-resume
cd tailor-resume

# Install dependencies
npm install

# Install Puppeteer's Chrome (if system Chrome doesn't work)
npx puppeteer browsers install chrome
```

## 3. Environment Variables

```bash
# Create .env file
cp .env.example .env
nano .env

# Fill in your keys:
# NVIDIA_API_KEY=nvapi-xxx
# GOOGLE_GEMINI_API_KEY=AIzaSy-xxx
# OPENROUTER_API_KEY=sk-or-v1-xxx
# SERPER_API_KEY=xxx
# LINKEDIN_LI_AT=xxx
# LINKEDIN_JSESSIONID=xxx
```

## 4. Puppeteer Config for Ubuntu

Create or edit `~/.puppeteerrc.cjs`:

```javascript
// ~/.puppeteerrc.cjs
const { join } = require('path');
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
```

OR set the Chrome path in your `.env`:

```bash
# If using system Chromium
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# If using Google Chrome
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

## 5. Build & Run

```bash
# Build the production version
npm run build

# Start production server
npm start
# Server runs on port 3000

# Or use PM2 for process management (recommended)
npm install -g pm2
pm2 start npm --name "tailor" -- start
pm2 save
pm2 startup  # auto-start on reboot
```

## 6. Nginx Reverse Proxy (Optional)

```bash
sudo apt install -y nginx

# Create site config
sudo tee /etc/nginx/sites-available/tailor <<'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;

        # SSE support (for queue progress)
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/tailor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. SSL with Let's Encrypt (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 8. Data Persistence

The app stores data in `data/` directory:

```
data/
├── base-resume/          # Your resume files (PDF/DOCX)
├── output/               # Generated tailored resumes (JSON/DOCX)
├── queue.json            # Job queue state
├── achievement-bank.yaml # Your achievement bank
├── preferences.yaml      # Tailoring preferences
└── auto-queue-config.yaml # Auto-queue search settings
```

**Important:** Back up `data/` directory regularly. Set up a cron job:

```bash
# Backup data daily at 2am
crontab -e
0 2 * * * tar czf /root/backups/tailor-data-$(date +\%Y\%m\%d).tar.gz /opt/tailor-resume/data/
```

## 9. Troubleshooting

### Puppeteer crashes

```bash
# Check if Chrome works
google-chrome-stable --headless --no-sandbox --print-to-pdf=test.pdf https://example.com

# If "no sandbox" needed, set in .env:
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### Port already in use

```bash
lsof -i :3000
kill -9 <PID>
```

### Memory issues (small VPS)

```bash
# Add swap if < 2GB RAM
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Node memory limit

```bash
# Set in PM2 ecosystem config
pm2 start npm --name "tailor" --node-args="--max-old-space-size=2048" -- start
```

## 10. Quick Commands

```bash
# View logs
pm2 logs tailor

# Restart
pm2 restart tailor

# Update from GitHub
cd /opt/tailor-resume && git pull && npm install && npm run build && pm2 restart tailor

# Check status
pm2 status
```
