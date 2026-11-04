# backend API 契約

Cloudflare Worker（`backend/`），網域預定 `api.doorbell.life`。資料庫 D1，品牌設定靜態檔寫到 R2，經 `cdn.doorbell.life/b/{brandId}.json` 提供。
所有回應 JSON；錯誤 `{ "error": "<code>" }`。元件相關端點不設 cookie、不存 IP（CLAUDE.md §3 第 6 條）。

## 曝光統計（元件呼叫）

`GET /s?h={hostname}&k={topic}`（元件以 sendBeacon 送，抽樣 1/10）

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
  - `logo`、`mascot`：先 `POST /brand/assets`（PNG/WebP/SVG 不收、≤200KB、只收 PNG/WebP）取得 CDN 網址
  - 存檔即輸出 `b/{id}.json`：`{ "t": template, "v": { "brand": hex, "brand-o": oklch }, "n": name, "logo": url? }`，元件只讀這個靜態檔
- `PUT /brand/sites` `{ sites: string[] }`：品牌主宣告自己的網域（報表只算這些網域）

## 報表（需登入）

- `GET /brand/report?from=YYYY-MM-DD&to=YYYY-MM-DD` → 依品牌網域，`[{ date, topic, country, impressions }]`，`impressions = count × 10`（抽樣乘回），回應附 `"sampling": 10`
- `GET /brand/report.csv?...` → 同上，CSV（UTF-8 BOM）
- PDF：前端報表頁的列印版面，瀏覽器「列印成 PDF」
