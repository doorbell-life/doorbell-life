---
title: 404 頁怎麼設計才有用？
description: 有用的 404 頁要做到三件事：清楚告訴訪客這頁找不到、給他繼續逛下去的路，而且伺服器照樣回傳 404 狀態碼。
region: taiwan
topic: webmasters
common: useful-404-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: Google 搜尋中心：Troubleshoot Google Search crawling errors（2025-12-18 更新）
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-04"
  - name: RFC 9110 HTTP Semantics（15.5 Client Error 4xx、404、410）
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-04"
  - name: Nginx 文件：error_page 指令
    url: https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page
    checkedAt: "2026-11-04"
  - name: Apache HTTP Server 2.4 文件：ErrorDocument 指令
    url: https://httpd.apache.org/docs/2.4/mod/core.html#errordocument
    checkedAt: "2026-11-04"
  - name: GitHub Docs：Creating a custom 404 page for your GitHub Pages site
    url: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
    checkedAt: "2026-11-04"
---

有用的 404 頁要做到三件事：清楚告訴訪客這頁找不到、給他繼續逛下去的路，而且伺服器照樣回傳 404 狀態碼。

## HTTP 規格本來就要錯誤頁說清楚

RFC 9110 對 4xx 錯誤的要求是：除了 HEAD 請求以外，伺服器應該附上一段內容，說明發生什麼錯誤，以及這是暫時還是永久的情況；瀏覽器應該把這段內容顯示給使用者看。

也就是說，404 頁的內容不是裝飾，而是規格期待你提供的說明。

## Google 建議的四件事

Google 搜尋中心在說明軟 404 錯誤時，列出設計自訂 404 頁的建議：

1. **清楚告訴訪客找不到這一頁。** 用友善、親切的語氣。
2. **長得和網站其他頁面一樣。** 保留相同的外觀和導覽列。
3. **放連結。** 例如最熱門的文章，以及回首頁的連結。
4. **讓訪客回報壞掉的連結。**

## 狀態碼一定要是 404

Google 說，自訂 404 頁純粹是做給人看的，對搜尋引擎沒有用處，所以要確定伺服器回傳 404，避免這頁被收錄。回傳 200 的「找不到」頁會被當成軟 404，詳見[〈自訂錯誤頁會影響 SEO 嗎？〉](/articles/taiwan/webmasters/custom-error-page-seo/)。

如果確定頁面是永久移除，RFC 9110 建議用 410；不確定是暫時還是永久，就用 404。

## 設定時常踩的雷

- **Nginx**：`error_page 404 /404.html;` 會保留 404。加了 `=200`（例如 `error_page 404 =200 /404.html;`）就會改成 200；寫成完整網址則預設回 302 轉址。
- **Apache**：`ErrorDocument 404 /404.html` 用本機路徑會保留 404；指到 `http` 開頭的外部網址時，Apache 會送出轉址，訪客和爬蟲都收不到 404。
- **靜態網站代管**：GitHub Pages 是在發布來源放一個 `404.html`（或 `404.md`）。其他平台的做法見[支援的主機環境](/support/taiwan/)。

改完後用 `curl -I https://你的網站/不存在的網址` 檢查，第一行應該是 404。

## 讓 404 頁多做一件事

訪客反正會看到這一頁，可以順便讓他看到需要幫忙的人或動物。按門鈴（doorbell.life）的元件在 404 頁上多顯示一張卡片，內容是待認養動物、捐血、失蹤協尋等公益資訊：

- 安裝只要在錯誤頁的 `</body>` 前加一行：`<script src="https://cdn.doorbell.life/widget.js" async data-status="404"></script>`
- 元件非同步載入，不改狀態碼、不轉址。
- 資料一律當純文字顯示；讀不到資料時什麼都不顯示，訪客只會看到你原本的 404 頁。

詳細步驟見[安裝說明](/install/taiwan/)。
