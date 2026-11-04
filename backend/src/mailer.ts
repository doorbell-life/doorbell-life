// 寄信介面：正式環境用 Cloudflare Email Service 的 send_email binding；測試注入假的寄件器。
export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Email Service Workers binding：`env.EMAIL.send({ from, to, subject, text })`。 */
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
    subject: "按門鈴 doorbell.life 登入連結 / Sign-in link",
    text: [
      "點下面的連結登入按門鈴品牌主後台，15 分鐘內有效、只能用一次：",
      "Use this link to sign in to doorbell.life. It works once and expires in 15 minutes:",
      "",
      link,
      "",
      "如果不是你本人要求，請忽略這封信。",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
  };
}
