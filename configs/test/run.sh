#!/bin/sh
# 在容器裡實際跑 nginx、Apache，確認錯誤頁內容正確、狀態碼不變。需要 Docker。
# 先執行 pnpm build 產生 templates/dist。
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'docker rm -f dbl-nginx dbl-apache >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

DOORBELL_BASE="file://$ROOT/templates/dist" sh "$ROOT/configs/update-templates.sh" "$WORK/www" zh-TW taiwan
ls "$WORK/www" | wc -l | grep -q 14 || { echo "範本下載不完整"; exit 1; }

fail=0
check() { # 網址 期望狀態碼 期望內容
  body="$(curl -s -o "$WORK/body" -w '%{http_code}' "$1")"
  if [ "$body" = "$2" ] && grep -q "$3" "$WORK/body"; then echo "ok   $2 $1"; else echo "FAIL $1 → $body（期望 $2，內容含「$3」）"; fail=1; fi
}

# nginx
mkdir -p "$WORK/nginx"
cat > "$WORK/nginx/default.conf" <<'CONF'
server {
    listen 80;
    root /usr/share/nginx/html;
    include /etc/nginx/snippets/doorbell-life.conf;
    location = /boom { return 500; }
    location = /secret { return 403; }
    location /app/ { proxy_pass http://127.0.0.1:9; }
}
CONF
docker run -d --name dbl-nginx -p 18080:80 \
  -v "$WORK/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$ROOT/configs/nginx/doorbell-life.conf:/etc/nginx/snippets/doorbell-life.conf:ro" \
  -v "$WORK/www:/var/www/doorbell-life:ro" nginx:stable >/dev/null
sleep 2
docker exec dbl-nginx nginx -t 2>&1 | tail -1
check http://127.0.0.1:18080/nope 404 "找不到這個頁面"
check http://127.0.0.1:18080/secret 403 "沒有存取權限"
check http://127.0.0.1:18080/boom 500 "求助專線"
check http://127.0.0.1:18080/app/x 502 "求助專線"
check http://127.0.0.1:18080/doorbell-life/404.html 404 "找不到這個頁面"

# Apache
mkdir -p "$WORK/apache"
docker run --rm httpd:2.4 cat /usr/local/apache2/conf/httpd.conf > "$WORK/apache/httpd.conf"
cat >> "$WORK/apache/httpd.conf" <<'CONF'
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
Include conf/doorbell-life.conf
RewriteEngine On
RewriteRule ^/gone$ - [G]
RewriteRule ^/secret$ - [F]
ProxyPass /app/ http://127.0.0.1:9/
CONF
docker run -d --name dbl-apache -p 18081:80 \
  -v "$WORK/apache/httpd.conf:/usr/local/apache2/conf/httpd.conf:ro" \
  -v "$ROOT/configs/apache/doorbell-life.conf:/usr/local/apache2/conf/doorbell-life.conf:ro" \
  -v "$WORK/www:/var/www/doorbell-life:ro" httpd:2.4 >/dev/null
sleep 2
docker exec dbl-apache httpd -t 2>&1 | tail -1
check http://127.0.0.1:18081/nope 404 "找不到這個頁面"
check http://127.0.0.1:18081/secret 403 "沒有存取權限"
check http://127.0.0.1:18081/gone 410 "這個頁面已經移除"
check http://127.0.0.1:18081/app/x 503 "求助專線"

exit $fail
