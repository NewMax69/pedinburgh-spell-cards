#!/usr/bin/env bash
# Установка Пединбурга на чистый Ubuntu 22.04/24.04 VPS.
# Запускать от root: bash setup.sh
set -euo pipefail

APP_DIR="/opt/pedinburgh"
PORT="3000"

echo "==> 1/6. Пакеты и Node.js 22"
apt-get update -y
apt-get install -y curl ca-certificates nginx ufw
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> 2/6. Swap 2 ГБ (сборка Next.js на 1 ГБ RAM падает)"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 3/6. Каталог приложения"
mkdir -p "$APP_DIR"

echo "==> 4/6. Nginx (порт 80 → $PORT)"
cat > /etc/nginx/sites-available/pedinburgh <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/pedinburgh /etc/nginx/sites-enabled/pedinburgh
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> 5/6. systemd-сервис"
cat > /etc/systemd/system/pedinburgh.service <<EOF
[Unit]
Description=Pedinburgh spell cards
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p $PORT
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pedinburgh

echo "==> 6/6. Файрвол"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

echo
echo "Готово. Дальше: загрузить проект в $APP_DIR, выполнить"
echo "  cd $APP_DIR && npm ci && npm run build && systemctl restart pedinburgh"
echo "Сайт: http://<IP-сервера>/"
