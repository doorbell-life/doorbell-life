# 寄信服務選型（信箱登入連結）

用途只有品牌主登入連結，量估每天數十封。條件：永久免費額度（CLAUDE.md §3 第 7 條）、可用自己的網域 `doorbell.life` 寄、能從 Cloudflare Worker 以 HTTPS 呼叫。Cloudflare Email Service 寄給任意收件人需 Workers 付費方案，不用（CLAUDE.md §13）。

## 比較（2026-11-04 查官方頁面）

| 服務 | 免費額度 | 永久免費？ | 免費方案可用自訂網域 | 查證日 | 來源 |
| --- | --- | --- | --- | --- | --- |
| Resend | 每月 3,000 封、每天 100 封 | 是（定價頁 FAQ：「free-forever plan」） | 是，3 個網域 | 2026-11-04 | https://resend.com/pricing |
| Brevo | 每天 300 封 | 是（說明中心：「The Free plan has no time limit」） | 未查證；免費方案寄出的信一律帶「Sent with Brevo」標記 | 2026-11-04 | https://www.brevo.com/pricing/ 、https://help.brevo.com/hc/en-us/articles/208580669 |
| Mailgun | 每天 100 封 | 是（官方比較頁：「100 emails/day with no time limit」） | 是，1 個網域 | 2026-11-04 | https://www.mailgun.com/pricing/ 、https://help.mailgun.com/hc/en-us/articles/203068914 |
| Postmark | 每月 100 封 | 是（「never expires」） | 是，最多 10 個網域 | 2026-11-04 | https://postmarkapp.com/pricing |
| SendGrid | 60 天試用，每天 100 封 | 否，試用期滿停寄 | （試用不適用） | 2026-11-04 | https://support.sendgrid.com/hc/en-us/articles/35270136965403 |
| Amazon SES | 沒有固定免費封數；新 AWS 帳號 200 美元抵用額度，12 個月內用完 | 否 | （不適用） | 2026-11-04 | https://aws.amazon.com/ses/pricing/ |

## 選定：Resend

- 永久免費、每天 100 封夠登入連結用（每個信箱 15 分鐘最多 3 次，見 API.md）；Postmark 每月 100 封不夠，SendGrid、SES 不是永久免費。
- 免費方案可用自己的網域，信裡不加服務商標記（Brevo 免費方案會加）。
- API 是單一 `POST https://api.resend.com/emails`，`Authorization: Bearer <key>`，JSON `{ from, to, subject, text }`，Worker 直接 `fetch`，不用 SDK。
- 開信、點擊追蹤預設關閉（「Open and click tracking is disabled by default for all domains」），而且要另外設定追蹤子網域才會生效。我們只送純文字、不送 `html`，Resend 沒有 HTML 可插追蹤像素或改寫連結。**驗證網域時不要開 tracking。**
- 到額度上限時 Resend 回 429 `daily_quota_exceeded` / `monthly_quota_exceeded`；寄信程式只記錯誤代碼，不記信箱與 token。

要注意的限制（Resend Acceptable Use Policy，https://resend.com/legal/acceptable-use ）：退信率要低於 4%、客訴率低於 0.08%，超過可能直接停權；也禁止開多個帳號規避額度。登入端點對任意信箱都會寄信，若有人大量灌不存在的信箱，退信率可能衝高；目前只有「同一信箱 15 分鐘 3 次」的限流，必要時再加全站每日上限。

## 設定步驟（網域註冊後）

1. 在 Resend 建帳號，Domains 加入 `doorbell.life`，tracking 保持關閉。
2. 在 Cloudflare DNS 加 Resend 顯示的紀錄（依 https://resend.com/docs/knowledge-base/cloudflare ，值以 Resend 後台顯示為準，Proxy 一律 DNS only）：

   | 類型 | 名稱 | 內容 | 備註 |
   | --- | --- | --- | --- |
   | TXT | `resend._domainkey` | `p=...`（DKIM 公鑰，Resend 產生） | DKIM |
   | MX | `send` | `feedback-smtp.<region>.amazonses.com`（Resend 顯示的值） | 優先順序 10；退信回報（Return-Path） |
   | TXT | `send` | `"v=spf1 include:amazonses.com ~all"` | SPF，只作用在 `send` 子網域，不影響根網域 |

   建議另加 DMARC（https://resend.com/docs/dashboard/domains/dmarc ）。
3. API Keys 建一把權限為 `sending_access`（只能寄信）的金鑰，`wrangler secret put RESEND_API_KEY` 存進 Worker。金鑰不進 repo、不放 `vars`。
4. 寄件者是 `wrangler.jsonc` 的 `MAIL_FROM`（`login@doorbell.life`）。
