#!/usr/bin/env bash
# One-time VPS setup (Ubuntu 24.04). Run as a sudo-capable user:
#   curl -fsSL https://raw.githubusercontent.com/sergioballesteros-vd/ketohoy/main/scripts/provision.sh | sudo DOMAIN=ketohoy.es bash
# or copy it over and: sudo DOMAIN=ketohoy.es bash provision.sh
# Idempotent: safe to re-run.
set -euo pipefail

: "${DOMAIN:?set DOMAIN, e.g. DOMAIN=ketohoy.es}"
APP_USER="${APP_USER:-ubuntu}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/$APP_USER/ketohoy}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl git rsync sqlite3 ufw build-essential python3 lsof \
  debian-keyring debian-archive-keyring apt-transport-https gpg

# Swap: `next build` can exhaust a 1-2 GB VPS.
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node 20 + PM2
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2
sudo -u "$APP_USER" env PATH="$PATH" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | grep '^sudo' | bash || true

# Caddy: automatic HTTPS (Let's Encrypt) + reverse proxy to the app on 127.0.0.1:3000
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl enable --now caddy && systemctl reload caddy

# Firewall: SSH + web only (the app itself binds to 127.0.0.1)
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

sudo -u "$APP_USER" mkdir -p "$DEPLOY_PATH"
echo "OK. Node $(node -v), pm2 $(pm2 -v), caddy $(caddy version | cut -d' ' -f1). Deploy path: $DEPLOY_PATH"
