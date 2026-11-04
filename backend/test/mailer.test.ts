// 寄信：Resend 請求格式、錯誤處理、不洩漏帳號存在與否、不記 token。fetch 一律是假的，不會寄出真信。
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handle, type Req } from "../src/app.ts";
import { loginMail, MailError, mailerFromEnv, RESEND_ENDPOINT, resendMailer } from "../src/mailer.ts";

const KEY = "re_test_not_a_real_key";
const TOKEN = "A".repeat(43);
const LINK = `https://doorbell.life/brand/login/?token=${TOKEN}`;

interface Captured {
  url: string;
  init: RequestInit;
}

function fakeFetch(res: () => Response | Promise<Response>) {
  const calls: Captured[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return res();
  }) as typeof fetch;
  return { f, calls };
}

const resendError = (status: number, name: string, message: string) =>
  new Response(JSON.stringify({ statusCode: status, name, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function codeOf(p: Promise<unknown>): Promise<MailError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(MailError);
    return e as MailError;
  }
  throw new Error("expected send to fail");
}

afterEach(() => vi.restoreAllMocks());

describe("loginMail", () => {
  it("is short plain Chinese text with the link, the 15-minute single-use rule and an ignore notice", () => {
    const m = loginMail("owner@example.com", LINK);
    expect(m.to).toBe("owner@example.com");
    expect(m.text).toContain(LINK);
    expect(m.text).toContain("15 分鐘內有效");
    expect(m.text).toContain("只能使用一次");
    expect(m.text).toContain("請直接忽略這封信");
    expect(m.text).not.toMatch(/<[a-z]/i);
    expect(m.text.split("\n").filter((l) => l.includes("http"))).toEqual([LINK]);
  });
});

describe("resendMailer", () => {
  it("POSTs plain-text JSON to the Resend API with a bearer key", async () => {
    const { f, calls } = fakeFetch(() => Response.json({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }));
    await resendMailer({ apiKey: KEY, from: "login@doorbell.life", fetch: f }).send(loginMail("owner@example.com", LINK));

    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe(RESEND_ENDPOINT);
    expect(RESEND_ENDPOINT).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const h = new Headers(init.headers);
    expect(h.get("Authorization")).toBe(`Bearer ${KEY}`);
    expect(h.get("Content-Type")).toBe("application/json");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      from: "login@doorbell.life",
      to: ["owner@example.com"],
      subject: loginMail("x@example.com", LINK).subject,
      text: loginMail("x@example.com", LINK).text,
    });
    // 不送 html：沒有可插追蹤像素、可改寫連結的內容
    expect(body).not.toHaveProperty("html");
  });

  it("turns provider errors into a code without the provider message, the address or the token", async () => {
    const cases: [Response, string][] = [
      [resendError(403, "validation_error", "You can only send testing emails to your own email address (owner@example.com)."), "resend_403_validation_error"],
      [resendError(429, "daily_quota_exceeded", "You have exceeded your daily email sending quota."), "resend_429_daily_quota_exceeded"],
      [resendError(401, "missing_api_key", "Missing API key in the authorization header."), "resend_401_missing_api_key"],
      [new Response("<html>bad gateway owner@example.com</html>", { status: 502 }), "resend_502_unknown"],
      [resendError(500, "Weird Name <owner@example.com>", "x"), "resend_500_unknown"],
    ];
    for (const [res, code] of cases) {
      const { f } = fakeFetch(() => res);
      const e = await codeOf(resendMailer({ apiKey: KEY, from: "login@doorbell.life", fetch: f }).send(loginMail("owner@example.com", LINK)));
      expect(e.code).toBe(code);
      for (const s of [e.code, e.message, String(e.stack)]) {
        expect(s).not.toContain("owner@example.com");
        expect(s).not.toContain(TOKEN);
        expect(s).not.toContain(KEY);
      }
    }
  });

  it("reports network failures and a missing key as codes", async () => {
    const boom = (async () => {
      throw new TypeError(`fetch failed for ${LINK}`);
    }) as typeof fetch;
    const net = await codeOf(resendMailer({ apiKey: KEY, from: "login@doorbell.life", fetch: boom }).send(loginMail("a@example.com", LINK)));
    expect(net.code).toBe("resend_network");
    expect(net.message).not.toContain(TOKEN);

    const { f, calls } = fakeFetch(() => Response.json({ id: "x" }));
    const missing = await codeOf(resendMailer({ apiKey: "", from: "login@doorbell.life", fetch: f }).send(loginMail("a@example.com", LINK)));
    expect(missing.code).toBe("resend_no_api_key");
    expect(calls).toHaveLength(0);
  });

  it("mailerFromEnv uses the RESEND_API_KEY secret and MAIL_FROM", async () => {
    const { f, calls } = fakeFetch(() => Response.json({ id: "x" }));
    vi.stubGlobal("fetch", f);
    await mailerFromEnv({ RESEND_API_KEY: KEY, MAIL_FROM: "login@doorbell.life" }).send(loginMail("a@example.com", LINK));
    vi.unstubAllGlobals();
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(String(calls[0].init.body)).from).toBe("login@doorbell.life");
  });
});

describe("/auth/request with the Resend mailer", () => {
  async function request(email: string, provider: () => Response): Promise<{ res: Response; logs: string[] }> {
    const logs: string[] = [];
    const capture = (...a: unknown[]) => logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
    for (const m of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, m).mockImplementation(capture);
    const { f } = fakeFetch(provider);
    const req = new Request("https://api.doorbell.life/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }) as Req;
    const ctx = createExecutionContext();
    const res = await handle(req, env, ctx, { mailer: resendMailer({ apiKey: KEY, from: "login@doorbell.life", fetch: f }), now: Date.now });
    await waitOnExecutionContext(ctx);
    vi.restoreAllMocks();
    return { res, logs };
  }

  it("answers the same whether sending succeeds or the provider rejects, and never logs the token, address or key", async () => {
    const ok = await request("sent@example.com", () => Response.json({ id: "x" }));
    const bad = await request("bounced@example.com", () =>
      resendError(403, "validation_error", "You can only send testing emails to your own email address (bounced@example.com)."),
    );
    expect(ok.res.status).toBe(202);
    expect(bad.res.status).toBe(ok.res.status);
    expect(await bad.res.text()).toBe(await ok.res.text());
    expect([...bad.res.headers.keys()].sort()).toEqual([...ok.res.headers.keys()].sort());

    const all = [...ok.logs, ...bad.logs].join("\n");
    expect(bad.logs.join("\n")).toContain("resend_403_validation_error");
    expect(all).not.toMatch(/token=|[A-Za-z0-9_-]{43}/);
    expect(all).not.toContain("@example.com");
    expect(all).not.toContain(KEY);
  });
});
