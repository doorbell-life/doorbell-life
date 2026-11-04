---
title: 429 被限流時可以給訪客看什麼？
description: 照 RFC 6585 的建議，在頁面上說明訪客在一段時間內送出太多請求；要等多久再試，可以用 Retry-After 標頭告訴他。
region: taiwan
topic: webmasters
common: rate-limit-429-page
publishedAt: "2026-11-03"
checkedAt: "2026-11-04"
sources:
  - name: RFC 6585 Additional HTTP Status Codes（4. 429 Too Many Requests）
    url: https://www.rfc-editor.org/rfc/rfc6585
    checkedAt: "2026-11-04"
  - name: RFC 9110 HTTP Semantics（10.2.3 Retry-After）
    url: https://www.rfc-editor.org/rfc/rfc9110
    checkedAt: "2026-11-04"
  - name: Google 抓取基礎架構文件：How HTTP status codes affect Google's crawlers（2026-02-04 更新）
    url: https://developers.google.com/crawling/docs/troubleshooting/http-status-codes
    checkedAt: "2026-11-04"
  - name: Google 搜尋中心：Troubleshoot Google Search crawling errors（2025-12-18 更新）
    url: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
    checkedAt: "2026-11-04"
  - name: Nginx 文件：ngx_http_limit_req_module（limit_req_status）
    url: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html#limit_req_status
    checkedAt: "2026-11-04"
---

照 RFC 6585 的建議，在頁面上說明訪客在一段時間內送出太多請求；要等多久再試，可以用 Retry-After 標頭告訴他。

## 429 是什麼

429 定義在 RFC 6585：使用者在一段時間內送出太多請求，也就是被「限流」了。規格對回應內容的要求是：

- 回應**應該**附上說明，解釋發生什麼事。
- **可以**加上 Retry-After 標頭，說明要等多久再送新請求。
- 429 回應**不可以**被快取保存。

RFC 6585 的範例很簡單：一個 HTML 頁面，標題是「Too Many Requests」，內文說明「這個網站每位登入使用者每小時只接受 50 個請求，請稍後再試」，標頭帶 `Retry-After: 3600`。

## Retry-After 怎麼寫

RFC 9110 定義 Retry-After 的值可以是秒數（例如 `Retry-After: 120` 代表 2 分鐘），也可以是日期時間（例如 `Retry-After: Fri, 31 Dec 1999 23:59:59 GMT`）。

## 頁面上該寫什麼

RFC 6585 對頁面內容的要求是**應該**說明發生什麼事；要等多久，規格放在 Retry-After 標頭，是「可以」加的選項。上面的範例頁就是把限流規則（每位登入使用者每小時 50 個請求）直接寫出來，再請訪客稍後再試。

限流怎麼算、怎麼辨識使用者，RFC 6585 沒有規定。

## Nginx 預設回的不是 429

Nginx 的 `limit_req` 模組預設用 503 拒絕超量的請求（`limit_req_status` 預設值是 503）。想回 429，要自己加上：

```nginx
limit_req_status 429;
```

再用 `error_page 429 /429.html;` 指定錯誤頁。

## 搜尋引擎怎麼看 429

Google 把 429 當成伺服器負載過重的訊號，會暫時放慢爬取速度。Google 也提醒，連續超過 2 天回 429 或 503，這些網址會從索引移除；爬取速度降下來之後，就要停止對爬蟲回 503 或 429。

## 讓等待的時間有用

被限流的訪客只能等。按門鈴（doorbell.life）的 429 範本會先顯示寫死在頁面裡的離線內容，再載入等待輪播元件，輪流顯示待認養動物、捐血、失蹤協尋等公益資訊；元件載不到時，留下的就是離線內容。

- 自己寫的 429 頁：在 `</body>` 前加 `<script src="https://cdn.doorbell.life/widget.js" async data-status="429" data-retry="120"></script>`。`data-retry` 填和 Retry-After 一樣的秒數，元件會顯示倒數，時間到了提示訪客可以再試。
- Nginx、Apache：設定範例會在 429 時回應本機的 429 範本，狀態碼維持 429。

元件不改狀態碼，也不會替你加 Retry-After 標頭，標頭要由你的伺服器送出。安裝方式見[安裝說明](/install/taiwan/)，各主機環境的限制見[支援的主機環境](/support/taiwan/)。
