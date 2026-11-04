---
title: 自訂錯誤頁會影響 SEO 嗎？
description: 不會，只要錯誤頁照常回傳 404、410 或 5xx 狀態碼，頁面內容怎麼設計都不影響 Google 怎麼處理這個網址；會出問題的是回傳 200 的「軟 404」，以及把錯誤頁做成轉址。
region: taiwan
topic: webmasters
common: custom-error-page-seo
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: Google 抓取基礎架構文件：How HTTP status codes affect Google's crawlers（2026-02-04 更新）
    url: https://developers.google.com/crawling/docs/troubleshooting/http-status-codes
    checkedAt: "2026-11-04"
  - name: Google 搜尋中心：Troubleshoot Google Search crawling errors（2025-12-18 更新）
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-04"
  - name: Google 搜尋中心：Understand JavaScript SEO Basics
    url: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
    checkedAt: "2026-11-04"
  - name: RFC 9110 HTTP Semantics（404、410）
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-04"
  - name: Nginx 文件：error_page 指令
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-04"
  - name: Apache HTTP Server 2.4 文件：ErrorDocument 指令
    url: https://httpd.apache.org/docs/2.4/mod/core.html#errordocument
    checkedAt: "2026-11-04"
  - name: Cloudflare 文件：Serving Pages（2026-10-10 更新）
    url: https://developers.cloudflare.com/pages/configuration/serving-pages/
    checkedAt: "2026-11-04"
---

不會，只要錯誤頁照常回傳 404、410 或 5xx 狀態碼，頁面內容怎麼設計都不影響 Google 怎麼處理這個網址；會出問題的是回傳 200 的「軟 404」，以及把錯誤頁做成轉址。

## Google 看的是狀態碼，不是頁面內容

Google 搜尋中心的說明文件寫得很清楚：

- 除了 429 以外，所有 4xx 錯誤的處理方式都一樣：這個網址如果原本有被收錄，會從索引移除；第一次遇到的 404 網址不會被處理。
- 回傳 4xx 時，頁面內容會被忽略。
- 5xx 和 429 會讓 Google 的爬蟲暫時放慢速度。已收錄的網址會先保留，但持續回傳錯誤，最後還是會被移除。

所以 404 頁放上導覽列、熱門文章、搜尋框，甚至公益資訊，都不會讓這個網址被收錄。Google 自己就說，自訂 404 頁是做給使用者看的，對搜尋引擎沒有用處，只要確定伺服器回傳 404 就好。

## 會出問題的情況一：軟 404

軟 404 是頁面告訴使用者「找不到」，狀態碼卻是 200（成功）。Google 演算法從內容判斷出這其實是錯誤頁時，Search Console 的「網頁索引」報表會標示「軟 404」，這種頁面也會被排除在搜尋結果之外。

常見的原因：

- 網站伺服器或內容管理系統出錯，卻照樣回 200。Google 舉的例子有：缺少伺服器端引入檔、資料庫連線中斷、站內搜尋結果是空的、JavaScript 檔沒載入。
- 單頁應用程式（SPA）在瀏覽器端處理路由，很難回傳正確的狀態碼。Google 建議兩種做法：用 JavaScript 轉到一個伺服器會回 404 的網址（例如 `/not-found`），或在錯誤畫面加上 `<meta name="robots" content="noindex">`。
- 靜態網站代管平台的預設行為。例如 Cloudflare Pages 的文件寫明，專案根目錄沒有 `404.html` 時，Pages 會當成單頁應用程式，找不到的路徑一律回首頁內容。

## 會出問題的情況二：錯誤頁變成轉址

設定錯誤頁時，一不小心就會把狀態碼換掉：

- **Nginx**：`error_page 404 =200 /404.html;` 這種寫法會把狀態碼改成 200。`error_page 404 http://example.com/notfound.html;` 寫成完整網址時，預設會回 302 轉址。
- **Apache**：`ErrorDocument` 指到外部網址（以 `http` 開頭）時，Apache 會送出轉址，用戶端收不到原本的錯誤狀態碼。官方文件特別提醒，這會讓靠狀態碼判斷網址是否有效的爬蟲混淆。指到本機路徑（以 `/` 開頭）就不會有這個問題。

## 頁面要刪掉時，用 404 還是 410？

RFC 9110 的定義：404 不表示是暫時還是永久找不到；如果確定是永久消失，建議用 410。對 Google 來說，除了 429 以外的 4xx 處理方式都一樣：已收錄的網址會被移出索引。

## 怎麼確認

用 `curl -I https://你的網站/不存在的網址` 看第一行，應該是 `404`，不是 `200` 或 `301`、`302`。

## 按門鈴的做法

按門鈴（doorbell.life）的錯誤頁元件只在原本的錯誤頁上多顯示一塊公益資訊（多數 4xx 是一張卡片，401、403 縮成一行，429、503 是輪播），不改狀態碼、不轉址。伺服器設定範例也一律保留原本的狀態碼：Nginx 的 `error_page` 不加 `=code`，Apache 的 `ErrorDocument` 只用本機路徑。安裝方式見[安裝說明](/install/taiwan/)，各主機環境能不能自訂錯誤頁見[支援的主機環境](/support/taiwan/)。
