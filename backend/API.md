# backend API 契約

Cloudflare Worker（`backend/`），網域預定 `api.doorbell.life`。資料庫 D1，品牌設定靜態檔寫到 R2，經 `cdn.doorbell.life/b/{brandId}.json` 提供。
所有回應 JSON；錯誤 `{ "error": "<code>" }`。元件相關端點不設 cookie、不存 IP（CLAUDE.md §3 第 6 條）。

## 曝光統計（元件呼叫）

`GET /s?h={hostname}&k={topic}`（元件以 sendBeacon 送，抽樣 1/10；sendBeacon 實際是 POST，所以 GET、POST 都收，不讀 body）

- 驗證：`h` 為合法主機名稱（最長 253、只含 a-z0-9.-），`k` 為 `schema` 的 TOPICS 之一；不合法直接回 204、不記錄。
- 記錄：D1 `impressions(date, host, topic, country, count)` 以 upsert 加 1。`country` 取 `request.cf.country`（Cloudflare 邊緣提供），不讀、不存 IP。`date` 用 UTC 日期。
- 回應：204，`Cache-Control: no-store`，不設 cookie。

## 品牌主登入（信箱登入連結，不設密碼）

- `POST /auth/request` `{ email }` → 產生一次性 token（32 bytes 隨機），D1 只存 SHA-256 雜湊與 15 分鐘到期時間；寄出 `https://doorbell.life/brand/login/?token=...`。不論信箱是否存在都回 202（不洩漏帳號存在與否）。同一信箱 15 分鐘內最多 3 次。
- `POST /auth/verify` `{ token }` → token 有效且未用過 → 標記已用，建立 session（D1 存 session 雜湊，30 天），回 `Set-Cookie: dbl_session=...; HttpOnly; Secure; SameSite=Strict; Path=/`。這是品牌主後台的登入 cookie，不是訪客 cookie。
- `POST /auth/logout` → 刪 session、清 cookie。
- 第一次登入的信箱自動建立品牌主帳號。

## 品牌設定（需登入）

- `GET /brand` → `{ id, email, settings, sites: string[] }`
- `PUT /brand/settings` `{ template, primary, font, logo?, mascot?, name }`
  - `template`：`bell` | `full-image` | `one-line`
  - `primary`：`oklch(L C H)`，L 0.45–0.55（淺底對比）；伺服器同時算出 hex 備援
  - `font`：白名單（系統字型堆疊、Noto Sans TC、Noto Serif TC）
  - `logo`、`mascot`：先 `POST /brand/assets`（只收 PNG、WebP，不收 SVG 以免夾帶腳本；≤200KB）取得 CDN 網址
  - 存檔即輸出 `b/{id}.json`：`{ "t": template, "v": { "brand": hex, "brand-o": oklch }, "n": name, "logo": url? }`，元件只讀這個靜態檔
- `PUT /brand/sites` `{ sites: string[] }`：品牌主宣告自己的網域（新宣告的網域是未驗證狀態）
- `GET /brand` 的 `sites` 改為 `[{ host, verified, txt }]`；`txt` 是要放進 DNS 的值 `doorbell-life-verify={每個品牌固定的隨機碼}`
- `POST /brand/sites/verify` `{ host }` → 伺服器用 DNS over HTTPS 查 `_doorbell-life.{host}` 的 TXT，找到相符的值就標記已驗證，回 `{ host, verified }`。報表只計入已驗證的網域

## 報表（需登入）

- `GET /brand/report?from=YYYY-MM-DD&to=YYYY-MM-DD` → 依品牌網域，`[{ date, topic, country, impressions }]`，`impressions = count × 10`（抽樣乘回），回應附 `"sampling": 10`。實際形狀：`{ "sampling": 10, "from", "to", "rows": [...] }`；區間最長 366 天
- `GET /brand/report.csv?...` → 同上，CSV（UTF-8 BOM）
- PDF：前端報表頁的列印版面，瀏覽器「列印成 PDF」

## 網域與部署（2026-11-04 維護者定）

- `cdn.doorbell.life`：一個 Worker，Workers 靜態資源提供 `dist/cdn`（元件、每日資料、範本）；`/s` 曝光統計；`/b/{id}.json` 與品牌素材由 R2 提供。
- `api.doorbell.life`：品牌主後台 API（`/auth/*`、`/brand/*`）。
- 寄信：不用 Cloudflare Email Service（寄給任意收件人需付費方案），改用有免費額度的服務，經 `mailer` 介面接上。

## 寄信（2026-11-04 選定 Resend，比較見 EMAIL.md）

- 服務：Resend 免費方案（每月 3,000 封、每天 100 封，永久免費，可用自己的網域）。
- 介面：`src/mailer.ts` 的 `Mailer.send({ to, subject, text })`。正式環境 `mailerFromEnv(env)` → `POST https://api.resend.com/emails`，`Authorization: Bearer ${RESEND_API_KEY}`，JSON `{ from: MAIL_FROM, to: [to], subject, text }`。測試注入假的寄件器或假的 `fetch`。
- 設定：secret `RESEND_API_KEY`（`wrangler secret put RESEND_API_KEY`，權限 `sending_access`；`wrangler.jsonc` 的 `secrets.required` 列名，不放值），var `MAIL_FROM` = `login@doorbell.life`。寄件網域 `doorbell.life` 要先在 Resend 驗證，DNS 紀錄見 EMAIL.md。
- 信件內容：只送純文字、繁體中文，寫明連結 15 分鐘內有效、只能用一次，沒有要求就忽略。不送 HTML，不開 Resend 的開信、點擊追蹤（網域設定預設關閉，保持關閉）。
- 失敗：`/auth/request` 先回 202，信在 `ctx.waitUntil` 裡寄；寄信失敗不改變回應（不洩漏帳號存在與否）。錯誤只丟 `MailError.code`，格式 `resend_{HTTP 狀態}_{Resend 錯誤 name}`（例如 `resend_429_daily_quota_exceeded`）、`resend_network`、`resend_no_api_key`；不帶 Resend 的錯誤訊息（可能含收件信箱），log 只記這個代碼，不記信箱、token、金鑰。不重試。
