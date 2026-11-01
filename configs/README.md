# configs：伺服器與代管平台設定範例

讓網頁伺服器、CDN、代管平台在錯誤時直接回應 doorbell.life 的錯誤頁。狀態碼一律維持原本的值，不轉址。

## 哪些環境可以自訂哪些錯誤頁

2026-11-01 依各平台官方文件查核。

| 環境 | 4xx | 5xx | 做法 |
| --- | --- | --- | --- |
| 自己管理的 Nginx | 可以 | 可以（含後端連不上的 502、504） | [`nginx/doorbell-life.conf`](nginx/doorbell-life.conf) |
| 自己管理的 Apache | 可以 | 可以（含後端連不上的 503） | [`apache/doorbell-life.conf`](apache/doorbell-life.conf) |
| Cloudflare 付費方案 | 可以 | 可以 | 儀表板 Custom Errors（[官方說明](https://developers.cloudflare.com/rules/custom-errors)）；錯誤頁網址填 `https://cdn.doorbell.life/t/{地區}/{狀態碼}.html` |
| Cloudflare 免費方案 | 用 Worker | 用 Worker | Custom Errors 不開放給免費方案；可改用 [`cloudflare/worker.js`](cloudflare/worker.js) 擋在網站前面，每個請求都會計入你自己的 Workers 免費額度 |
| GitHub Pages、Netlify、Vercel、Cloudflare Pages | 只有 404 | 不行 | 把範本的 `404.html` 放在網站根目錄，見 [static-hosts.md](static-hosts.md)；官方文件沒有提供自訂 5xx 的方式 |
| 共享主機 | 視主機商 | 多半不行 | 若主機商開放 `.htaccess`，可用 Apache 範例裡的 `ErrorDocument` 幾行 |

## 範本檔

伺服器設定使用本機檔案，用 [`update-templates.sh`](update-templates.sh) 下載，建議每天用 cron 執行一次：

```sh
sh update-templates.sh /var/www/doorbell-life zh-TW taiwan
```

```cron
15 4 * * * sh /opt/doorbell-life/update-templates.sh /var/www/doorbell-life zh-TW taiwan
```

下載失敗時會保留舊檔。網站壞掉時，伺服器直接回應本機檔案，不需要連到 doorbell.life。

## 限流的 429

Nginx 的 `limit_req` 預設回 503，要回 429 請加 `limit_req_status 429;`。

## 測試

`sh configs/test/run.sh` 會在 Docker 容器裡實際啟動 Nginx 與 Apache，逐一確認狀態碼與頁面內容。
