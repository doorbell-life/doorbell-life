// 寄信介面：正式環境用 Resend（HTTPS JSON API，有永久免費額度，選型見 EMAIL.md）；測試注入假的寄件器或假的 fetch。
// 原則：寄信失敗只丟出不含信箱、token、供應商訊息的錯誤代碼；本檔不寫任何 log。
export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** 寄信失敗。`code` 只含 HTTP 狀態與供應商錯誤名稱（例如 `resend_429_daily_quota_exceeded`），可以安全寫進 log。 */
export class MailError extends Error {
  constructor(readonly code: string) {
    super(`mail_failed:${code}`);
    this.name = "MailError";
  }
}

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface ResendOptions {
  /** Worker secret `RESEND_API_KEY`（`wrangler secret put RESEND_API_KEY`），只授權寄信（Sending access）的金鑰即可。 */
  apiKey: string;
  /** 寄件者，例如 `login@doorbell.life`；網域要先在 Resend 驗證。 */
  from: string;
  fetch?: typeof fetch;
}

/**
 * Resend `POST /emails`。只送純文字（不送 html），所以 Resend 沒有可插追蹤像素或改寫連結的 HTML；
 * 網域的 open/click tracking 預設關閉，不要開（EMAIL.md）。
 */
export function resendMailer(o: ResendOptions): Mailer {
  const doFetch = o.fetch ?? fetch;
  return {
    async send(mail) {
      if (!o.apiKey) throw new MailError("resend_no_api_key");
      let res: Response;
      try {
        res = await doFetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: { Authorization: `Bearer ${o.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: o.from, to: [mail.to], subject: mail.subject, text: mail.text }),
        });
      } catch {
        throw new MailError("resend_network");
      }
      if (res.ok) {
        await res.body?.cancel();
        return;
      }
      throw new MailError(`resend_${res.status}_${await errorName(res)}`);
    },
  };
}

/** 只取 Resend 錯誤 JSON 的 `name`（例如 `validation_error`），不取 `message`：message 可能含收件信箱。 */
async function errorName(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    const name = typeof body === "object" && body !== null ? (body as { name?: unknown }).name : undefined;
    if (typeof name === "string" && /^[a-z_]{1,64}$/.test(name)) return name;
  } catch {
    // 不是 JSON
  }
  return "unknown";
}

/** 正式環境的寄件器：金鑰來自 Worker secret `RESEND_API_KEY`，寄件者來自 var `MAIL_FROM`。 */
export function mailerFromEnv(env: { RESEND_API_KEY?: string; MAIL_FROM: string }): Mailer {
  return resendMailer({ apiKey: env.RESEND_API_KEY ?? "", from: env.MAIL_FROM });
}

/**
 * 舊的 Cloudflare Email Service 寄件器。寄給任意收件人需 Workers 付費方案（CLAUDE.md §13），不再使用；
 * 只為了讓 `src/index.ts` 在改接 `mailerFromEnv(env)` 之前仍能編譯，改完就刪掉（連同 wrangler.jsonc 的 send_email）。
 * @deprecated 改用 `mailerFromEnv`
 */
export function emailServiceMailer(binding: SendEmail, from: string): Mailer {
  return {
    async send(mail) {
      await binding.send({ from, to: mail.to, subject: mail.subject, text: mail.text });
    },
  };
}

export function loginMail(to: string, link: string): Mail {
  return {
    to,
    subject: "按門鈴 doorbell.life 登入連結",
    text: [
      "您好：",
      "",
      "請點下面的連結登入按門鈴品牌主後台。連結 15 分鐘內有效，只能使用一次。",
      "",
      link,
      "",
      "如果您沒有要求登入，請直接忽略這封信，帳號不會有任何變動。",
      "",
      "按門鈴 doorbell.life",
    ].join("\n"),
  };
}
