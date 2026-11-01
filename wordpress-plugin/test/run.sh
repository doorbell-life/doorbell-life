#!/bin/sh
# 在 Docker 裡架 WordPress，實際驗證外掛：404 狀態碼與元件、設定白名單、維護頁 503、不覆蓋別人的檔案、停用時清理。
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NET=dbl-wp
PORT=18090
URL="http://127.0.0.1:$PORT"
cleanup() { docker rm -f dbl-wp-db dbl-wp >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker network create $NET >/dev/null
docker run -d --name dbl-wp-db --network $NET -e MARIADB_ROOT_PASSWORD=root -e MARIADB_DATABASE=wp -e MARIADB_USER=wp -e MARIADB_PASSWORD=wp mariadb:11 >/dev/null
docker run -d --name dbl-wp --network $NET -p $PORT:80 \
  -e WORDPRESS_DB_HOST=dbl-wp-db -e WORDPRESS_DB_USER=wp -e WORDPRESS_DB_PASSWORD=wp -e WORDPRESS_DB_NAME=wp \
  -v "$ROOT/wordpress-plugin/doorbell-life:/var/www/html/wp-content/plugins/doorbell-life:ro" wordpress:latest >/dev/null

wp() { docker run --rm --network $NET --volumes-from dbl-wp --user 33 -e WORDPRESS_DB_HOST=dbl-wp-db -e WORDPRESS_DB_USER=wp -e WORDPRESS_DB_PASSWORD=wp -e WORDPRESS_DB_NAME=wp wordpress:cli wp "$@"; }

for i in $(seq 1 60); do wp db check >/dev/null 2>&1 && break; sleep 2; done
wp core install --url="$URL" --title=t --admin_user=a --admin_password=a --admin_email=a@example.com --skip-email >/dev/null
wp rewrite structure '/%postname%/' >/dev/null
wp plugin activate doorbell-life >/dev/null
wp option update doorbell_life_options '{"lang":"zh-TW","region":"taiwan","topics":["animals-adopt","<bad>"]}' --format=json >/dev/null

fail=0
ok() { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }
get() { curl -s -o /tmp/dbl-body -w '%{http_code}' "$1"; }

[ "$(get "$URL/no-such-page/")" = 404 ] && ok "404 狀態碼不變" || bad "404 狀態碼"
grep -q 'data-status="404" data-lang="zh-TW" data-region="taiwan" data-topics="animals-adopt" src="https://cdn.doorbell.life/widget.js' /tmp/dbl-body && ok "404 頁載入元件，設定只留白名單議題" || { bad "404 頁的 script"; grep -o '<script[^>]*doorbell[^>]*>' /tmp/dbl-body || true; }
grep -q '<bad>' /tmp/dbl-body && bad "不在白名單的值出現在頁面" || ok "不在白名單的值被丟掉"
[ "$(get "$URL/")" = 200 ] && ! grep -q 'cdn.doorbell.life' /tmp/dbl-body && ok "首頁不載入元件" || bad "首頁不該有元件"

wp eval 'var_dump( doorbell_life_maintenance_install() );' | grep -q 'bool(true)' && ok "產生維護頁" || bad "產生維護頁"
wp maintenance-mode activate >/dev/null 2>&1
[ "$(get "$URL/")" = 503 ] && grep -q 'data-status="503"' /tmp/dbl-body && ok "維護模式回 503 並載入元件" || bad "維護模式"
wp maintenance-mode deactivate >/dev/null 2>&1

wp plugin deactivate doorbell-life >/dev/null
[ "$(wp eval 'echo file_exists( WP_CONTENT_DIR . "/maintenance.php" ) ? 1 : 0;')" = 0 ] && ok "停用時移除維護頁" || bad "停用後維護頁還在"

wp plugin activate doorbell-life >/dev/null
docker exec dbl-wp sh -c 'echo "<?php // someone else" > /var/www/html/wp-content/maintenance.php'
wp eval 'var_dump( is_wp_error( doorbell_life_maintenance_install() ) );' | grep -q 'bool(true)' && ok "不覆蓋別人的維護頁" || bad "覆蓋了別人的維護頁"
wp plugin deactivate doorbell-life >/dev/null
docker exec dbl-wp grep -q 'someone else' /var/www/html/wp-content/maintenance.php && ok "停用時不刪別人的維護頁" || bad "刪了別人的維護頁"

exit $fail
