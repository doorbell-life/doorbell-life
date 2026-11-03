---
title: 503 維護頁怎麼做？
description: 維護期間回傳 503 狀態碼，加上 Retry-After 標頭說明大約多久恢復，頁面用純靜態 HTML 寫清楚何時回來、去哪裡看最新消息；Google 建議這種整站關閉只用在一兩天內。
region: taiwan
topic: webmasters
common: maintenance-503-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-03"
sources:
  - name: RFC 9110 HTTP Semantics（503、Retry-After）
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-03"
  - name: Google 搜尋中心：Temporarily pause or disable a website（2025-12-10 更新）
    url: https://developers.google.com/search/docs/crawling-indexing/pause-online-business
    checkedAt: "2026-11-03"
  - name: Google 搜尋中心：Troubleshoot Google Search crawling errors（2025-12-18 更新）
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-03"
  - name: Google 搜尋中心：HTTP 狀態碼、網路與 DNS 錯誤如何影響 Google 搜尋
    url: https://developers.google.com/search/docs/crawling-indexing/http-network-errors
    checkedAt: "2026-11-03"
---

維護期間回傳 503 狀態碼，加上 Retry-After 標頭說明大約多久恢復，頁面用純靜態 HTML 寫清楚何時回來、去哪裡看最新消息；Google 建議這種整站關閉只用在一兩天內。

## 為什麼是 503

RFC 9110 定義 503 是「伺服器暫時無法處理請求，例如負載過重或排定維護，過一段時間應該會恢復」。重點是「暫時」：搜尋引擎和程式看到 503，就知道這頁還在，只是現在不能用。

不要用其他狀態碼代替。Google 明確提醒，用 403、404、410 擋住網站，或加上 noindex，會讓網址從 Google 搜尋移除。

## 加上 Retry-After

RFC 9110 規定，Retry-After 搭配 503 時，代表服務預計多久無法使用。值有兩種寫法：

- 秒數，例如 `Retry-After: 120` 代表 2 分鐘。
- 日期時間，例如 `Retry-After: Fri, 31 Dec 1999 23:59:59 GMT`。

Google 也建議 503 錯誤頁附上 `retry-after` 標頭，填你盡力估計的日期或秒數。

## 頁面要寫什麼

Google 建議在錯誤頁上給使用者清楚的下一步，例如：

1. 更多資訊的連結，例如官方社群帳號或狀態頁。
2. 預計恢復的日期，或下次更新資訊的時間。
3. 怎麼聯絡客服。

## 頁面要怎麼做

為了減輕伺服器和瀏覽器的負擔，Google 建議：

- 用靜態 HTML。
- 盡量少用外部資源：CSS 直接寫在頁面裡，圖片用 base64 內嵌。
- 上線前用 `curl -I` 確認回應真的是 `503`。

## 不要關太久

Google 的建議是：

- 緊急關站 1 到 2 天：回 503 和說明頁。
- 要關更久：改用 200 狀態碼放一個可以被收錄的首頁，告訴大家目前的狀況。
- 整站關閉最多幾天，否則即使做法正確，對搜尋還是會有明顯影響。

另一份文件也提醒，連續超過 2 天回 503 或 429，Google 會把這些網址從索引移除。持續回傳 500、502、503 的網址，最後也會被移出索引。

## 別把 robots.txt 一起擋掉

Google 特別提醒，robots.txt 不能回 503，否則會擋住所有爬取。維護期間仍要讓 robots.txt 正常回應，也不要改成禁止所有爬取。

## 用維護頁幫別人一把

遇到維護頁的訪客只能等。按門鈴（doorbell.life）的 503 範本會先顯示寫死在頁面裡的離線內容，再載入等待輪播元件，輪流顯示待認養動物、捐血、失蹤協尋等公益資訊；元件載不到時，留下的就是離線內容。

- **自己寫的維護頁**：在 `</body>` 前加 `<script src="https://cdn.doorbell.life/widget.js" async data-status="503" data-retry="600"></script>`。`data-retry` 填和 Retry-After 一樣的秒數，元件會顯示倒數。
- **WordPress**：外掛可以在後台一鍵產生 `wp-content/maintenance.php`，回傳 503 和 `Retry-After: 600`，並載入等待輪播元件；已經有別人產生的同名檔案時不會覆蓋，停用外掛時會自動移除自己產生的檔案。
- **Nginx、Apache**：設定範例會在 503 時回應本機的 503 範本，狀態碼維持 503。

元件不改狀態碼，也不會替你加 Retry-After 標頭，標頭要由你的伺服器送出。安裝方式見[安裝說明](/install/taiwan/)。
