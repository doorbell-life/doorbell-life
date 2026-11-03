---
title: 5xx 時怎麼顯示自訂頁面？
description: 5xx 錯誤頁要由網頁伺服器、CDN 或負載平衡器直接回應，因為這時網站程式可能已經壞了；自己管理的 Nginx、Apache 和 Cloudflare 付費方案做得到，GitHub Pages、Cloudflare Pages 這類靜態代管平台的官方文件則只提供自訂 404。
region: taiwan
topic: webmasters
common: custom-5xx-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-03"
sources:
  - name: RFC 9110 HTTP Semantics（15.6 Server Error 5xx）
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
  - name: Nginx 文件：error_page 指令
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-03"
  - name: Nginx 文件：proxy_intercept_errors 指令
    url: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_intercept_errors
    checkedAt: "2026-11-03"
  - name: Apache HTTP Server 2.4 文件：ErrorDocument 指令
    url: https://httpd.apache.org/docs/2.4/mod/core.html#errordocument
    checkedAt: "2026-11-03"
  - name: Cloudflare 文件：Custom Errors（2026-09-08 更新）
    url: https://developers.cloudflare.com/rules/custom-errors/
    checkedAt: "2026-11-03"
  - name: Cloudflare 文件：Serving Pages（2026-10-10 更新）
    url: https://developers.cloudflare.com/pages/configuration/serving-pages/
    checkedAt: "2026-11-03"
  - name: GitHub Docs：Creating a custom 404 page for your GitHub Pages site
    url: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
    checkedAt: "2026-11-03"
  - name: Google 搜尋中心：Temporarily pause or disable a website（2025-12-10 更新）
    url: https://developers.google.com/search/docs/crawling-indexing/pause-online-business
    checkedAt: "2026-11-03"
---

5xx 錯誤頁要由網頁伺服器、CDN 或負載平衡器直接回應，因為這時網站程式可能已經壞了；自己管理的 Nginx、Apache 和 Cloudflare 付費方案做得到，GitHub Pages、Cloudflare Pages 這類靜態代管平台的官方文件則只提供自訂 404。

## 為什麼不能交給網站程式

RFC 9110 對幾個常見 5xx 的定義：

- **500**：伺服器遇到預期外的狀況，沒辦法完成請求。
- **502**：伺服器當作閘道或代理時，從後端收到無效的回應。
- **503**：伺服器暫時無法處理請求，例如負載過重或排定維護。
- **504**：伺服器當作閘道或代理時，後端沒有及時回應。

502、504 的意思就是「後端的網站程式沒有好好回應」。這時候錯誤頁只能由前面那一層（Nginx、Apache、CDN）送出，而且最好是放在本機的靜態檔案，不必再連到別的地方。

RFC 9110 也要求 5xx 回應附上一段內容，說明發生什麼錯誤、是暫時還是永久的情況。

## Nginx

用 `error_page` 指定錯誤頁，例如 `error_page 502 /50x.html;`。不要加 `=200` 這類寫法，否則狀態碼會被改掉。

網站放在反向代理後面時，後端程式自己回傳的錯誤，Nginx 預設會原樣轉給訪客。要換成你的錯誤頁，需要打開 `proxy_intercept_errors on;`：Nginx 文件說明，打開後，後端回傳 300 以上的狀態碼會交給 `error_page` 處理。

## Apache

用 `ErrorDocument 503 /errors/503.html` 這種本機路徑寫法，狀態碼會保留。指到外部網址時，Apache 會改送轉址，訪客收不到原本的 5xx。

反向代理的情況要打開 `ProxyErrorOverride`。Apache 文件說明，沒開的話，代理過來的內容不會套用自訂錯誤頁。

`ErrorDocument` 也可以寫在 `.htaccess`（需要 `AllowOverride FileInfo`）。共享主機如果開放 `.htaccess`，就有機會用這個方法；但 5xx 能不能被換掉，要看主機商的架構，請先問主機商。

## Cloudflare

Cloudflare 的 Custom Errors 可以把來源伺服器回傳的錯誤（400 以上）換成你的頁面。依官方文件（2026-09-08 更新）：

- 免費方案不能用；Pro、Business、Enterprise 可以。
- 錯誤頁是你提供一個網址，Cloudflare 抓下來連同圖片、CSS、JavaScript 一起存在自己的網路上，之後原網址不必一直在線。
- 規則可以選擇改狀態碼，要維持原本的狀態碼就不要改。

## 靜態網站代管平台

GitHub Pages 和 Cloudflare Pages 的官方文件只說明怎麼放 `404.html`，沒有提供自訂 5xx 的方式。其他平台的整理見[支援的主機環境](/support/taiwan/)。

## 頁面內容要簡單

Google 建議 503 錯誤頁用靜態 HTML，盡量少用外部資源，CSS 直接寫在頁面裡，圖片用 base64 內嵌，並在頁面上告訴使用者接下來可以怎麼做。這個原則也適用於其他 5xx：網站正在出問題，錯誤頁本身不該再依賴它。

## 按門鈴的 5xx 頁

按門鈴（doorbell.life）提供 500、501、502、504 的離線錯誤頁範本：純靜態、不需要 JavaScript，內容是求助專線、宣導數字和可以快取的待認養動物資料，失蹤人口個案不會出現在離線頁。

- **Nginx、Apache**：用設定範例和下載腳本，把範本存成本機檔案，建議每天更新一次；下載失敗會保留舊檔。網站壞掉時，伺服器直接回應本機檔案。
- **Cloudflare 免費方案**：可以用我們提供的 Worker 擋在網站前面，網站回傳 5xx 或連不上時，改回應離線錯誤頁，狀態碼維持原本的值（完全連不上時回 502）。每個請求都會經過這個 Worker，會計入你自己帳號的 Workers 免費額度。
- **安裝 CLI**：偵測到 Nginx、Apache 時，會下載範本、產生設定片段和每日更新的 cron；把設定掛進網站與重新載入，留給你自己做。

詳細步驟見[安裝說明](/install/taiwan/)，哪些主機做不到見[支援的主機環境](/support/taiwan/)。
