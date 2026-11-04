# backend API 契約

一個 Cloudflare Worker（`backend/`）提供兩個網域，程式依主機名稱分流（`src/app.ts`）：

| 網域 | 內容 |
| --- | --- |
| `cdn.doorbell.life` | Workers 靜態資源提供 `dist/cdn`（元件、樣式、每日資料、時區對應、範本）；Worker 程式只處理 `/s` 曝光統計與 `/b/` 品牌設定與素材（R2） |
| `api.doorbell.life` | 品牌主後台：`/auth/*`、`/brand/*`（本機開發時其他主機名稱也走這裡） |

資料庫 D1（`migrations/`），品牌設定與素材存 R2。`/auth/*`、`/brand/*` 回應一律 JSON（CSV 例外）、`Cache-Control: no-store`；錯誤 `{ "error": "<code>" }`。元件相關端點不設 cookie、不存 IP（CLAUDE.md §3 第 6 條）。

## cdn.doorbell.life

### 靜態資源（不執行 Worker 程式，不算 Worker 呼叫）

- 來源：根目錄 `pnpm build` 組出的 `dist/cdn`（`.github/scripts/assemble-cdn.ts`）。`wrangler.jsonc` 的 `assets`：`html_handling: "none"`（`/t/{地區}/{狀態碼}.html` 原樣提供、不轉址）、`not_found_handling: "none"`、`run_worker_first: ["/s", "/b/*"]`。
- 時區對應：`dist/cdn/_redirects` 的 `/z/{時區}.json /d/{地區}.json 200` 由靜態資源直接套用（改寫，不轉址）。沒有對應的時區落到 Worker，回 404。
- 回應標頭：`dist/cdn/_headers`（來源 `backend/cdn/_headers`）對所有靜態檔加 `Access-Control-Allow-Origin: *`（元件從任何網站跨來源 fetch 每日資料；Workers 靜態資源預設不帶）與 `X-Content-Type-Options: nosniff`。
- 快取：沿用靜態資源預設 `Cache-Control: public, max-age=0, must-revalidate` ＋ `ETag`（`If-None-Match` 相符回 304）。元件更新後，下一位訪客就拿到新版。

### `/s` 曝光統計（元件呼叫）

`GET /s?h={hostname}&k={topic}`（元件以 sendBeacon 送，抽樣 1/10；sendBeacon 實際是 POST，所以 GET、POST 都收，不讀 body）

- 驗證：`h` 為合法主機名稱（最長 253、只含 a-z0-9.-），`k` 為 `schema` 的 TOPICS 之一；不合法直接回 204、不記錄。其他方法也回 204、不記錄。
- 記錄：D1 `impressions(host, date, topic, country, count)` 以 upsert 加 1。`country` 取 `request.cf.country`（Cloudflare 邊緣提供），取不到記 `XX`；不讀、不存 IP。`date` 用 UTC 日期。
- 回應：204，`Cache-Control: no-store`，不設 cookie。
- 只在 `cdn.doorbell.life`；`api.doorbell.life/s` 回 404。

### `/b/` 品牌設定與素材（R2）

- 只提供兩種鍵：`/b/{品牌 id}.json`、`/b/{品牌 id}/{sha256}.png|webp`（品牌 id 為 24 個 hex 字元）。其他路徑一律 404，不讀 R2。
- 方法：GET、HEAD；其他回 405（`Allow: GET, HEAD`）。
- `Content-Type` 依路徑決定：`application/json; charset=utf-8`、`image/png`、`image/webp`。
- `Cache-Control`：品牌 JSON `public, max-age=300`；素材 `public, max-age=31536000, immutable`（網址含內容雜湊）。
- 一律帶 `Access-Control-Allow-Origin: *`、`X-Content-Type-Options: nosniff`、`ETag`；`If-None-Match` 相符回 304。
- 找不到回 404（`Cache-Control: no-store`），元件改用預設樣式。
- `cdn.doorbell.life` 上的其他路徑（含 `/auth/*`、`/brand/*`）回 404。

## 品牌主登入（信箱登入連結，不設密碼）

- `POST /auth/request` `{ email }` → 產生一次性 token（32 bytes 隨機，base64url 43 字），D1 只存 SHA-256 雜湊與 15 分鐘到期時間；寄出 `https://doorbell.life/brand/login/?token=...`。不論信箱是否存在都回 202 `{ ok: true }`（不洩漏帳號存在與否）。同一信箱 15 分鐘內最多 3 次，超過回 429 `rate_limited`（`Retry-After: 900`）。信箱格式不對回 400 `invalid_email`。
- `POST /auth/verify` `{ token }` → token 有效且未用過 → 標記已用，建立 session（D1 存 session 雜湊，30 天），回 200 `{ ok: true }` 與 `Set-Cookie: dbl_session=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`。這是品牌主後台的登入 cookie，不是訪客 cookie。失敗一律 400：
  - `{ "error": "used" }`：連結已用過
  - `{ "error": "expired" }`：超過 15 分鐘
  - `{ "error": "invalid_token" }`：格式不對或不認得
- `POST /auth/logout` → 刪 session、清 cookie（`Max-Age=0`）。
- 第一次登入的信箱自動建立品牌主帳號（同時產生該品牌固定的網域驗證碼）。

## 來源與 CORS（`/auth/*`、`/brand/*`）

- 只有 `https://doorbell.life`（`SITE_ORIGIN`）可帶 cookie 呼叫：回 `Access-Control-Allow-Origin: https://doorbell.life`、`Access-Control-Allow-Credentials: true`。
- 預檢 `OPTIONS`：允許 `GET, POST, PUT`、標頭 `Content-Type`；其他來源回 403。
- 非 GET 請求帶了別的 `Origin` 回 403 `forbidden_origin`。
- JSON 端點只收 `Content-Type: application/json`（body 上限 4 KB，`PUT /brand/sites` 16 KB；超過回 413 `too_large`）。

## 品牌設定（需登入，未登入或 session 過期回 401 `unauthorized`）

- `GET /brand` → `{ id, email, settings, sites }`
  - `settings`：還沒存過是 `null`，否則是 `PUT /brand/settings` 存下的物件
  - `sites`：`[{ host, verified, txt }]`，依 host 排序；`txt` 是要放進 DNS 的值 `doorbell-life-verify={每個品牌固定的 32 字元 hex 隨機碼}`，同一品牌所有網域相同
- `PUT /brand/settings` `{ template, primary, font, name, logo?, mascot? }` → 200 `{ settings, published }`（`published` 是 `https://cdn.doorbell.life/b/{id}.json`）
  - `template`：`bell` | `full-image` | `one-line`，否則 400 `invalid_template`
  - `primary`：`oklch(L C H)`，L 0.45–0.55（淺底對比）、C 0–0.4、H 0–360，數字為十進位（不收 `%`、`deg`、透明度），否則 400 `invalid_primary`；存檔時正規化到小數 4 位，伺服器同時算出 hex 備援
  - `font`：`"system"` | `"Noto Sans TC"` | `"Noto Serif TC"`，否則 400 `invalid_font`
  - `name`：1–60 字，不收控制字元、雙向文字控制字元、零寬字元與角括號，否則 400 `invalid_name`
  - `logo`、`mascot`：可省略或 `null`；有給時必須是本品牌用 `POST /brand/assets` 上傳過的網址，否則 400 `invalid_logo`／`invalid_mascot`
  - 存檔即輸出 R2 `b/{id}.json`：`{ "t": template, "v": { "brand": hex, "brand-o": oklch }, "n": name, "logo": url? }`，元件只讀這個靜態檔
- `POST /brand/assets`：body 是圖檔原始位元組（不是 multipart）
  - `Content-Type` 必須是 `image/png` 或 `image/webp`（可帶參數），且與檔頭判斷的類型一致，否則 415 `unsupported_type`；不收 SVG（避免夾帶腳本）
  - 上限 200,000 bytes，超過回 413 `too_large`（不只看 `Content-Length`，邊讀邊算）；空 body 回 400 `empty`
  - 成功回 201 `{ url }`，`url` 為 `https://cdn.doorbell.life/b/{id}/{sha256}.png|webp`
- `PUT /brand/sites` `{ sites: string[] }`：整份取代品牌主宣告的網域（最多 50 個，主機名稱規則同 `/s`，重複會合併），回 200 `{ sites: [{ host, verified, txt }] }`。新加入的網域是未驗證；清單裡原本就有的網域保留驗證狀態。格式不對回 400 `invalid_sites`。
- `POST /brand/sites/verify` `{ host }` → 用 Cloudflare DNS over HTTPS（`GET https://cloudflare-dns.com/dns-query?name=_doorbell-life.{host}&type=TXT`，`accept: application/dns-json`）查 TXT，任一筆 TXT 值（多段字串接起來、去頭尾空白）等於該品牌的 `txt` 就標記已驗證，回 200 `{ host, verified: true }`；找不到（含 NXDOMAIN）回 `{ host, verified: false }`，原本已驗證的也改回未驗證（結果反映 DNS 現況）。
  - `host` 格式不對回 400 `invalid_host`；不在該品牌的網域清單回 404 `unknown_site`
  - DNS 查詢失敗（連線失敗、逾時 5 秒、HTTP 非 2xx、SERVFAIL 等）回 502 `dns_unavailable`，驗證狀態不變

## 報表（需登入）

- `GET /brand/report?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ "sampling": 10, "from", "to", "rows": [{ date, topic, country, impressions }] }`
  - 只計入該品牌**已驗證**的網域
  - `impressions = count × 10`（抽樣乘回），依日期、議題、國家加總並排序
  - 日期不合法、`from > to`、區間超過 366 天回 400 `invalid_range`
- `GET /brand/report.csv?from=...&to=...` → 同上，CSV（UTF-8 BOM、CRLF），欄位 `date,topic,country,impressions`；標頭 `Content-Type: text/csv; charset=utf-8`、`Content-Disposition: attachment; filename="doorbell-report-{from}-{to}.csv"`
- PDF：前端報表頁的列印版面，瀏覽器「列印成 PDF」

## 寄信

寄信改用 Resend，見下一節。

## 寄信（2026-11-04 選定 Resend，比較見 EMAIL.md）

- 服務：Resend 免費方案（每月 3,000 封、每天 100 封，永久免費，可用自己的網域）。
- 介面：`src/mailer.ts` 的 `Mailer.send({ to, subject, text })`。正式環境 `mailerFromEnv(env)` → `POST https://api.resend.com/emails`，`Authorization: Bearer ${RESEND_API_KEY}`，JSON `{ from: MAIL_FROM, to: [to], subject, text }`。測試注入假的寄件器或假的 `fetch`。
- 設定：secret `RESEND_API_KEY`（`wrangler secret put RESEND_API_KEY`，權限 `sending_access`；`wrangler.jsonc` 的 `secrets.required` 列名，不放值），var `MAIL_FROM` = `login@doorbell.life`。寄件網域 `doorbell.life` 要先在 Resend 驗證，DNS 紀錄見 EMAIL.md。
- 信件內容：只送純文字、繁體中文，寫明連結 15 分鐘內有效、只能用一次，沒有要求就忽略。不送 HTML，不開 Resend 的開信、點擊追蹤（網域設定預設關閉，保持關閉）。
- 失敗：`/auth/request` 先回 202，信在 `ctx.waitUntil` 裡寄；寄信失敗不改變回應（不洩漏帳號存在與否）。錯誤只丟 `MailError.code`，格式 `resend_{HTTP 狀態}_{Resend 錯誤 name}`（例如 `resend_429_daily_quota_exceeded`）、`resend_network`、`resend_no_api_key`；不帶 Resend 的錯誤訊息（可能含收件信箱），log 只記這個代碼，不記信箱、token、金鑰。不重試。

## 部署前要換的值

`wrangler.jsonc` 裡標 PLACEHOLDER 的值（D1 id、R2 bucket 名稱、寄件設定），以及網域註冊後打開 `routes`（`cdn.doorbell.life`、`api.doorbell.life` 兩個 custom domain）。
