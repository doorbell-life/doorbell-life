#!/bin/sh
# 下載 doorbell.life 錯誤頁範本到本機資料夾，給網頁伺服器在 4xx、5xx 時直接回應。
# 建議每天用 cron 執行一次，讓離線頁的宣導數字與待認養資料保持更新。
# 下載失敗時保留舊檔，不會留下空白或半截的檔案。
#
# 用法：sh update-templates.sh [資料夾] [介面語言] [地區]
#   資料夾預設 /var/www/doorbell-life；介面語言 zh-TW 或 en；地區 taiwan
#   環境變數 DOORBELL_BASE 可改下載來源（測試用，可用 file:// 網址）
set -eu

DIR="${1:-/var/www/doorbell-life}"
LANG_CODE="${2:-zh-TW}"
REGION="${3:-taiwan}"
BASE="${DOORBELL_BASE:-https://cdn.doorbell.life/t}"

mkdir -p "$DIR"
fetch() {
  tmp="$DIR/.$2.tmp"
  if curl -fsSL --max-time 30 -o "$tmp" "$BASE/$1/$2.html" && [ -s "$tmp" ]; then
    mv "$tmp" "$DIR/$2.html"
  else
    rm -f "$tmp"
    echo "doorbell-life: 無法下載 $1/$2.html，保留舊檔" >&2
  fi
}

for code in 400 401 403 404 405 408 410 414; do fetch "$LANG_CODE" "$code"; done
for code in 429 500 501 502 503 504; do fetch "$REGION" "$code"; done
