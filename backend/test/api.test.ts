// 在 workerd 裡跑，使用本機 D1、R2。寄信改用假的寄件器，不會寄出真信。
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { handle, type Req } from "../src/app.ts";
import type { Mail } from "../src/mailer.ts";

const ORIGIN = "https://doorbell.life";
const START = Date.parse("2026-11-04T12:00:00Z");
let clock = START;
let mails: Mail[] = [];
// DNS over HTTPS 的假回應：名稱 → TXT 值（undefined＝NXDOMAIN）；dohFail 時回 SERVFAIL
let dns: Record<string, string[]> = {};
let dohFail = false;
let dohQueries: { url: string; accept: string | null }[] = [];
const q = (t: string) => `"${t.replace(/(["\\])/g, "\\$1")}"`;
const deps = {
  mailer: {
    async send(m: Mail) {
      mails.push(m);
    },
  },
  now: () => clock,
  dohFetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    dohQueries.push({ url: String(input), accept: new Headers(init?.headers).get("accept") });
    if (dohFail) return Response.json({ Status: 2, TC: false, RD: true, RA: true, AD: false, CD: false });
    const name = url.searchParams.get("name")!;
    const values = dns[name];
    if (!values) return Response.json({ Status: 3, Question: [{ name, type: 16 }], Authority: [] });
    return Response.json({
      Status: 0,
      Question: [{ name, type: 16 }],
      Answer: [
        { name, type: 5, TTL: 300, data: "elsewhere.example." },
        ...values.map((v) => ({ name, type: 16, TTL: 300, data: v.length > 20 ? `${q(v.slice(0, 20))} ${q(v.slice(20))}` : q(v) })),
      ],
    });
  }) as typeof fetch,
};

beforeEach(() => {
  clock = START;
  mails = [];
  dns = {};
  dohFail = false;
  dohQueries = [];
});

interface CallOpts {
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
  cookie?: string;
  country?: string;
  host?: string;
}

async function call(method: string, path: string, o: CallOpts = {}): Promise<Response> {
  const headers = new Headers(o.headers);
  if (o.json !== undefined) headers.set("Content-Type", "application/json");
  if (o.cookie) headers.set("Cookie", o.cookie);
  const init: RequestInit<IncomingRequestCfProperties> = {
    method,
    headers,
    body: o.json !== undefined ? JSON.stringify(o.json) : o.body,
  };
  if (o.country) init.cf = { country: o.country } as IncomingRequestCfProperties;
  const req = new Request(`https://${o.host ?? "api.doorbell.life"}${path}`, init) as Req;
  const ctx = createExecutionContext();
  const res = await handle(req, env, ctx, deps);
  await waitOnExecutionContext(ctx);
  return res;
}

/** cdn.doorbell.life 上的請求（/s、/b/） */
const cdn = (method: string, path: string, o: CallOpts = {}) => call(method, path, { ...o, host: "cdn.doorbell.life" });

const tokenFrom = (m: Mail) => /token=([A-Za-z0-9_-]{43})/.exec(m.text)![1];

async function login(email: string): Promise<string> {
  expect((await call("POST", "/auth/request", { json: { email } })).status).toBe(202);
  const res = await call("POST", "/auth/verify", { json: { token: tokenFrom(mails.at(-1)!) } });
  expect(res.status).toBe(200);
  return /dbl_session=([^;]+)/.exec(res.headers.get("Set-Cookie")!)![0];
}

async function count(host: string): Promise<number> {
  const r = await env.DB.prepare("SELECT COALESCE(SUM(count), 0) AS n FROM impressions WHERE host = ?1").bind(host).first<{ n: number }>();
  return r!.n;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 1, 2, 3]);

describe("/s impressions", () => {
  it("counts valid beacons with one upsert row, by UTC date and country", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await cdn("POST", "/s?h=shop.example.com&k=animals-adopt", { country: "TW" });
      expect(res.status).toBe(204);
      expect(res.headers.get("Set-Cookie")).toBeNull();
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    }
    await cdn("GET", "/s?h=shop.example.com&k=animals-adopt", { country: "US" });
    const rows = await env.DB.prepare("SELECT * FROM impressions WHERE host = 'shop.example.com' ORDER BY country").all();
    expect(rows.results).toEqual([
      { host: "shop.example.com", date: "2026-11-04", topic: "animals-adopt", country: "TW", count: 3 },
      { host: "shop.example.com", date: "2026-11-04", topic: "animals-adopt", country: "US", count: 1 },
    ]);
  });

  it("an upsert writes a single row (D1 rows_written)", async () => {
    await cdn("POST", "/s?h=meta.example.com&k=blood");
    const r = await env.DB.prepare(
      "INSERT INTO impressions (host, date, topic, country, count) VALUES ('meta.example.com', '2026-11-04', 'blood', 'XX', 1) " +
        "ON CONFLICT (host, date, topic, country) DO UPDATE SET count = count + 1",
    ).run();
    expect(r.meta.rows_written).toBe(1);
  });

  it("ignores invalid input but still returns 204", async () => {
    for (const q of [
      "",
      "?h=shop.example.com",
      "?h=shop.example.com&k=ads",
      "?h=Shop.Example.com&k=blood",
      "?h=%3Cscript%3E&k=blood",
      `?h=${"a.".repeat(130)}com&k=blood`,
      "?h=bad_host.com&k=blood",
    ]) {
      const res = await cdn("GET", "/s" + q);
      expect(res.status).toBe(204);
    }
    expect((await cdn("PUT", "/s?h=put.example.com&k=blood")).status).toBe(204);
    expect(await count("put.example.com")).toBe(0);
    expect(await count("bad_host.com")).toBe(0);
    const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM impressions WHERE host NOT LIKE '%example.com'").first<{ n: number }>();
    expect(total!.n).toBe(0);
  });

  it("records country XX when cf.country is missing", async () => {
    await cdn("POST", "/s?h=nocf.example.com&k=stats");
    const r = await env.DB.prepare("SELECT country FROM impressions WHERE host = 'nocf.example.com'").first<{ country: string }>();
    expect(r!.country).toBe("XX");
  });
});

describe("auth", () => {
  it("sends a one-time login link and stores only hashes", async () => {
    const res = await call("POST", "/auth/request", { json: { email: " Owner@Example.com " } });
    expect(res.status).toBe(202);
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe("owner@example.com");
    expect(mails[0].text).toContain("https://doorbell.life/brand/login/?token=");
    const token = tokenFrom(mails[0]);
    const stored = await env.DB.prepare("SELECT hash FROM login_tokens WHERE email = 'owner@example.com'").all<{ hash: string }>();
    expect(stored.results).toHaveLength(1);
    expect(stored.results[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.results[0].hash).not.toContain(token);

    const ok = await call("POST", "/auth/verify", { json: { token } });
    expect(ok.status).toBe(200);
    const again = await call("POST", "/auth/verify", { json: { token } });
    expect(again.status).toBe(400);
    expect(await again.json()).toEqual({ error: "used" });

    const sessions = await env.DB.prepare("SELECT hash FROM sessions").all<{ hash: string }>();
    const cookieToken = /dbl_session=([^;]+)/.exec(ok.headers.get("Set-Cookie")!)![1];
    expect(sessions.results.every((s) => s.hash !== cookieToken && /^[0-9a-f]{64}$/.test(s.hash))).toBe(true);
  });

  it("rejects expired tokens", async () => {
    await call("POST", "/auth/request", { json: { email: "late@example.com" } });
    clock += 15 * 60 * 1000 + 1;
    const res = await call("POST", "/auth/verify", { json: { token: tokenFrom(mails[0]) } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "expired" });
  });

  it("rejects malformed and unknown tokens", async () => {
    expect((await call("POST", "/auth/verify", { json: { token: "x" } })).status).toBe(400);
    const unknown = await call("POST", "/auth/verify", { json: { token: "A".repeat(43) } });
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({ error: "invalid_token" });
    expect((await call("POST", "/auth/verify", { body: "{}", headers: { "Content-Type": "text/plain" } })).status).toBe(400);
  });

  it("rate limits to 3 requests per email per 15 minutes", async () => {
    for (let i = 0; i < 3; i++) expect((await call("POST", "/auth/request", { json: { email: "rl@example.com" } })).status).toBe(202);
    const limited = await call("POST", "/auth/request", { json: { email: "rl@example.com" } });
    expect(limited.status).toBe(429);
    expect(mails).toHaveLength(3);
    // 其他信箱不受影響
    expect((await call("POST", "/auth/request", { json: { email: "other@example.com" } })).status).toBe(202);
    clock += 15 * 60 * 1000 + 1;
    expect((await call("POST", "/auth/request", { json: { email: "rl@example.com" } })).status).toBe(202);
  });

  it("caps sign-in mails site-wide per day", async () => {
    const day = clock;
    const stmt = env.DB.prepare("INSERT INTO login_tokens (hash, email, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)");
    await env.DB.batch(Array.from({ length: 90 }, (_, i) => stmt.bind(`h${i}`, `u${i}@example.com`, day, day + 1)));
    const capped = await call("POST", "/auth/request", { json: { email: "new@example.com" } });
    try {
      expect(capped.status).toBe(429);
      expect(mails).toHaveLength(0);
    } finally {
      await env.DB.prepare("DELETE FROM login_tokens WHERE hash LIKE 'h%'").run();
    }
  });

  it("does not leak whether an account exists", async () => {
    await login("exists@example.com");
    const a = await call("POST", "/auth/request", { json: { email: "exists@example.com" } });
    const b = await call("POST", "/auth/request", { json: { email: "nobody@example.com" } });
    expect(a.status).toBe(b.status);
    expect(await a.text()).toBe(await b.text());
    expect([...a.headers.keys()].sort()).toEqual([...b.headers.keys()].sort());
  });

  it("rejects invalid emails", async () => {
    for (const email of ["", "no-at", "a@b", "<a>@example.com", 5]) {
      expect((await call("POST", "/auth/request", { json: { email } })).status).toBe(400);
    }
    expect(mails).toHaveLength(0);
  });

  it("sets a HttpOnly, Secure, SameSite=Strict session cookie and logs out", async () => {
    await call("POST", "/auth/request", { json: { email: "cookie@example.com" } });
    const res = await call("POST", "/auth/verify", { json: { token: tokenFrom(mails[0]) } });
    const c = res.headers.get("Set-Cookie")!;
    expect(c).toMatch(/^dbl_session=[A-Za-z0-9_-]{43}; /);
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/", "Max-Age=2592000"]) expect(c).toContain(flag);
    expect(c).not.toMatch(/Domain=/i);
    const cookie = /dbl_session=[^;]+/.exec(c)![0];

    expect((await call("GET", "/brand", { cookie })).status).toBe(200);
    const out = await call("POST", "/auth/logout", { cookie });
    expect(out.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await call("GET", "/brand", { cookie })).status).toBe(401);
  });

  it("expires sessions after 30 days", async () => {
    const cookie = await login("old@example.com");
    clock += 30 * 86400 * 1000 + 1;
    expect((await call("GET", "/brand", { cookie })).status).toBe(401);
  });

  it("creates the brand account on first login only", async () => {
    const c1 = await login("first@example.com");
    const id1 = ((await (await call("GET", "/brand", { cookie: c1 })).json()) as { id: string }).id;
    const c2 = await login("first@example.com");
    const b = (await (await call("GET", "/brand", { cookie: c2 })).json()) as Record<string, unknown>;
    expect(b).toEqual({ id: id1, email: "first@example.com", settings: null, sites: [] });
  });
});

describe("CORS and origin", () => {
  it("allows credentials only for https://doorbell.life", async () => {
    const pre = await call("OPTIONS", "/brand/settings", { headers: { Origin: ORIGIN } });
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    expect(pre.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect((await call("OPTIONS", "/auth/request", { headers: { Origin: "https://evil.example" } })).status).toBe(403);

    const res = await call("POST", "/auth/request", { json: { email: "c@example.com" }, headers: { Origin: ORIGIN } });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    const evil = await call("POST", "/auth/request", { json: { email: "c@example.com" }, headers: { Origin: "https://evil.example" } });
    expect(evil.status).toBe(403);
    expect(evil.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("requires login for /brand", async () => {
    expect((await call("GET", "/brand")).status).toBe(401);
    expect((await call("GET", "/brand", { cookie: "dbl_session=" + "A".repeat(43) })).status).toBe(401);
  });
});

describe("brand settings and assets", () => {
  it("validates settings", async () => {
    const cookie = await login("settings@example.com");
    const good = { template: "bell", primary: "oklch(0.5 0.12 150)", font: "Noto Sans TC", name: "綠色乖乖" };
    const cases: [Record<string, unknown>, string][] = [
      [{ ...good, template: "custom" }, "invalid_template"],
      [{ ...good, primary: "oklch(0.7 0.12 150)" }, "invalid_primary"],
      [{ ...good, primary: "#00ff00" }, "invalid_primary"],
      [{ ...good, font: "Comic Sans MS" }, "invalid_font"],
      [{ ...good, font: "noto-sans-tc" }, "invalid_font"],
      [{ ...good, font: "__proto__" }, "invalid_font"],
      [{ ...good, name: "<img src=x>" }, "invalid_name"],
      [{ ...good, logo: "https://evil.example/x.png" }, "invalid_logo"],
      [{ ...good, mascot: "javascript:alert(1)" }, "invalid_mascot"],
    ];
    for (const [json, code] of cases) {
      const res = await call("PUT", "/brand/settings", { cookie, json });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: code });
    }
  });

  it("rejects SVG, JPEG and oversize uploads by sniffing bytes", async () => {
    const cookie = await login("assets@example.com");
    const svg = await call("POST", "/brand/assets", {
      cookie,
      body: "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
      headers: { "Content-Type": "image/png" },
    });
    expect(svg.status).toBe(415);
    const jpeg = await call("POST", "/brand/assets", { cookie, body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) });
    expect(jpeg.status).toBe(415);
    const big = new Uint8Array(200_000 + 1);
    big.set(PNG);
    const png = { "Content-Type": "image/png" };
    expect((await call("POST", "/brand/assets", { cookie, body: big, headers: png })).status).toBe(413);
    const exact = new Uint8Array(200_000);
    exact.set(PNG);
    expect((await call("POST", "/brand/assets", { cookie, body: exact, headers: png })).status).toBe(201);
    // 不靠 Content-Length 也擋得住
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(big);
        c.close();
      },
    });
    expect((await call("POST", "/brand/assets", { cookie, body: stream, headers: png })).status).toBe(413);
  });

  it("requires a PNG/WebP Content-Type that matches the bytes, and a non-empty body", async () => {
    const cookie = await login("ctype@example.com");
    const up = (body: BodyInit, type?: string) =>
      call("POST", "/brand/assets", { cookie, body, headers: type ? { "Content-Type": type } : {} });
    expect((await up(PNG, "text/html")).status).toBe(415);
    expect((await up(PNG)).status).toBe(415);
    expect((await up(PNG, "image/webp")).status).toBe(415);
    expect((await up(PNG, "image/svg+xml")).status).toBe(415);
    const empty = await up(new Uint8Array(), "image/png");
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "empty" });
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    const ok = await up(webp, "image/webp");
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as { url: string }).url).toMatch(/^https:\/\/cdn\.doorbell\.life\/b\/[0-9a-f]{24}\/[0-9a-f]{64}\.webp$/);
    expect((await up(PNG, "image/png; charset=binary")).status).toBe(201);
  });

  it("uploads a PNG and publishes b/{id}.json in the contract shape", async () => {
    const cookie = await login("publish@example.com");
    const { id } = (await (await call("GET", "/brand", { cookie })).json()) as { id: string };

    const up = await call("POST", "/brand/assets", { cookie, body: PNG, headers: { "Content-Type": "image/png" } });
    expect(up.status).toBe(201);
    const { url } = (await up.json()) as { url: string };
    expect(url).toMatch(new RegExp(`^https://cdn\\.doorbell\\.life/b/${id}/[0-9a-f]{64}\\.png$`));
    const obj = await env.CDN.get(url.slice("https://cdn.doorbell.life/".length));
    expect(obj!.httpMetadata!.contentType).toBe("image/png");
    await obj!.arrayBuffer();

    const res = await call("PUT", "/brand/settings", {
      cookie,
      json: { template: "full-image", primary: "oklch(0.55 0.16 55)", font: "system", name: "乖乖", logo: url },
    });
    expect(res.status).toBe(200);
    const published = await env.CDN.get(`b/${id}.json`);
    expect(published!.httpMetadata!.contentType).toBe("application/json; charset=utf-8");
    expect(await published!.json()).toEqual({
      t: "full-image",
      v: { brand: "#b55000", "brand-o": "oklch(0.55 0.16 55)" },
      n: "乖乖",
      logo: url,
    });

    const b = (await (await call("GET", "/brand", { cookie })).json()) as { settings: unknown };
    expect(b.settings).toEqual({ template: "full-image", primary: "oklch(0.55 0.16 55)", font: "system", name: "乖乖", logo: url });
  });

  it("rejects asset URLs of another brand or never uploaded", async () => {
    const cookie = await login("foreign@example.com");
    const other = `https://cdn.doorbell.life/b/${"0".repeat(24)}/${"a".repeat(64)}.png`;
    const res = await call("PUT", "/brand/settings", {
      cookie,
      json: { template: "bell", primary: "oklch(0.5 0.1 20)", font: "system", name: "x", logo: other },
    });
    expect(res.status).toBe(400);
    const { id } = (await (await call("GET", "/brand", { cookie })).json()) as { id: string };
    const missing = `https://cdn.doorbell.life/b/${id}/${"a".repeat(64)}.png`;
    const res2 = await call("PUT", "/brand/settings", {
      cookie,
      json: { template: "bell", primary: "oklch(0.5 0.1 20)", font: "system", name: "x", mascot: missing },
    });
    expect(res2.status).toBe(400);
  });
});

interface SiteOut {
  host: string;
  verified: boolean;
  txt: string;
}

async function sitesOf(cookie: string): Promise<SiteOut[]> {
  return ((await (await call("GET", "/brand", { cookie })).json()) as { sites: SiteOut[] }).sites;
}

/** 宣告網域、在假 DNS 放上 TXT、驗證 */
async function verifyHosts(cookie: string, hosts: string[]): Promise<void> {
  const res = await call("PUT", "/brand/sites", { cookie, json: { sites: hosts } });
  expect(res.status).toBe(200);
  const txt = (await sitesOf(cookie))[0].txt;
  for (const h of hosts) {
    dns[`_doorbell-life.${h}`] = [txt];
    const v = await call("POST", "/brand/sites/verify", { cookie, json: { host: h } });
    expect(await v.json()).toEqual({ host: h, verified: true });
  }
}

describe("sites and verification", () => {
  it("validates and replaces sites, returning { host, verified, txt }", async () => {
    const cookie = await login("sites@example.com");
    expect((await call("PUT", "/brand/sites", { cookie, json: { sites: ["ok.com", "bad host"] } })).status).toBe(400);
    expect((await call("PUT", "/brand/sites", { cookie, json: { sites: "ok.com" } })).status).toBe(400);
    const res = await call("PUT", "/brand/sites", { cookie, json: { sites: ["b.example.org", "a.example.org", "a.example.org"] } });
    const { sites } = (await res.json()) as { sites: SiteOut[] };
    expect(sites.map((s) => [s.host, s.verified])).toEqual([
      ["a.example.org", false],
      ["b.example.org", false],
    ]);
    expect(sites[0].txt).toMatch(/^doorbell-life-verify=[0-9a-f]{32}$/);
    expect(sites[1].txt).toBe(sites[0].txt);
    await call("PUT", "/brand/sites", { cookie, json: { sites: ["c.example.org"] } });
    expect((await sitesOf(cookie)).map((s) => s.host)).toEqual(["c.example.org"]);
  });

  it("gives each brand its own fixed TXT value", async () => {
    const c1 = await login("txt1@example.com");
    const c2 = await login("txt2@example.com");
    await call("PUT", "/brand/sites", { cookie: c1, json: { sites: ["t.example.org"] } });
    await call("PUT", "/brand/sites", { cookie: c2, json: { sites: ["t.example.org"] } });
    const [a] = await sitesOf(c1);
    const [b] = await sitesOf(c2);
    expect(a.txt).not.toBe(b.txt);
    await call("PUT", "/brand/sites", { cookie: c1, json: { sites: ["t.example.org", "u.example.org"] } });
    expect((await sitesOf(c1)).every((s) => s.txt === a.txt)).toBe(true);
  });

  it("verifies a host via DoH TXT at _doorbell-life.{host}", async () => {
    const cookie = await login("verify@example.com");
    await call("PUT", "/brand/sites", { cookie, json: { sites: ["shop.example.io"] } });
    const [site] = await sitesOf(cookie);

    // 還沒放 TXT（NXDOMAIN）
    let res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "shop.example.io" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ host: "shop.example.io", verified: false });
    expect(dohQueries[0].url).toBe("https://cloudflare-dns.com/dns-query?name=_doorbell-life.shop.example.io&type=TXT");
    expect(dohQueries[0].accept).toBe("application/dns-json");

    // 放了別的值（例如別的品牌的碼）
    dns["_doorbell-life.shop.example.io"] = ["doorbell-life-verify=" + "0".repeat(32), "v=spf1 -all"];
    res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "shop.example.io" } });
    expect(await res.json()).toEqual({ host: "shop.example.io", verified: false });

    // 放了正確的值（長度超過 20，假 DNS 會拆成兩段字串，測試接回）
    dns["_doorbell-life.shop.example.io"] = ["v=spf1 -all", site.txt];
    res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "shop.example.io" } });
    expect(await res.json()).toEqual({ host: "shop.example.io", verified: true });
    expect((await sitesOf(cookie))[0].verified).toBe(true);

    // 重新儲存清單時，保留下來的網域維持已驗證
    await call("PUT", "/brand/sites", { cookie, json: { sites: ["shop.example.io", "new.example.io"] } });
    expect((await sitesOf(cookie)).map((s) => [s.host, s.verified])).toEqual([
      ["new.example.io", false],
      ["shop.example.io", true],
    ]);

    // 移除 TXT 後再驗證：改回未驗證
    delete dns["_doorbell-life.shop.example.io"];
    res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "shop.example.io" } });
    expect(await res.json()).toEqual({ host: "shop.example.io", verified: false });
  });

  it("rejects hosts that are invalid or not declared, and reports DNS failures as 502", async () => {
    const cookie = await login("verify2@example.com");
    await call("PUT", "/brand/sites", { cookie, json: { sites: ["mine.example.io"] } });
    let res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "Bad Host" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_host" });
    res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "other.example.io" } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "unknown_site" });
    expect(dohQueries).toHaveLength(0);

    dohFail = true;
    res = await call("POST", "/brand/sites/verify", { cookie, json: { host: "mine.example.io" } });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "dns_unavailable" });
    expect((await call("POST", "/brand/sites/verify", { json: { host: "mine.example.io" } })).status).toBe(401);
  });
});

describe("reports", () => {
  it("reports only the brand's verified sites, multiplied by 10, as JSON and CSV with BOM", async () => {
    const cookie = await login("report@example.com");
    await verifyHosts(cookie, ["r1.example.net", "r2.example.net"]);
    await call("PUT", "/brand/sites", { cookie, json: { sites: ["r1.example.net", "r2.example.net", "unverified.example.net"] } });
    await cdn("POST", "/s?h=r1.example.net&k=blood", { country: "TW" });
    await cdn("POST", "/s?h=r2.example.net&k=blood", { country: "TW" });
    await cdn("POST", "/s?h=r1.example.net&k=missing-children", { country: "TW" });
    await cdn("POST", "/s?h=not-mine.example.net&k=blood", { country: "TW" });
    await cdn("POST", "/s?h=unverified.example.net&k=blood", { country: "TW" });
    clock += 86400 * 1000;
    await cdn("POST", "/s?h=r1.example.net&k=blood", { country: "US" });

    const res = await call("GET", "/brand/report?from=2026-11-04&to=2026-11-05", { cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sampling: 10,
      from: "2026-11-04",
      to: "2026-11-05",
      rows: [
        { date: "2026-11-04", topic: "blood", country: "TW", impressions: 20 },
        { date: "2026-11-04", topic: "missing-children", country: "TW", impressions: 10 },
        { date: "2026-11-05", topic: "blood", country: "US", impressions: 10 },
      ],
    });

    const csv = await call("GET", "/brand/report.csv?from=2026-11-04&to=2026-11-04", { cookie });
    expect(csv.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(csv.headers.get("Content-Disposition")).toBe('attachment; filename="doorbell-report-2026-11-04-2026-11-04.csv"');
    const bytes = new Uint8Array(await csv.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe(
      "date,topic,country,impressions\r\n2026-11-04,blood,TW,20\r\n2026-11-04,missing-children,TW,10\r\n",
    );
  });

  it("does not count a host another brand verified", async () => {
    const owner = await login("owner2@example.com");
    const squatter = await login("squatter@example.com");
    await verifyHosts(owner, ["owned.example.net"]);
    await call("PUT", "/brand/sites", { cookie: squatter, json: { sites: ["owned.example.net"] } });
    // DNS 上只有擁有者的碼
    const v = await call("POST", "/brand/sites/verify", { cookie: squatter, json: { host: "owned.example.net" } });
    expect(await v.json()).toEqual({ host: "owned.example.net", verified: false });
    await cdn("POST", "/s?h=owned.example.net&k=blood", { country: "TW" });
    const r = (await (await call("GET", "/brand/report?from=2026-11-04&to=2026-11-04", { cookie: squatter })).json()) as {
      rows: unknown[];
    };
    expect(r.rows).toEqual([]);
  });

  it("rejects bad ranges", async () => {
    const cookie = await login("range@example.com");
    for (const q of ["", "?from=2026-11-05&to=2026-11-04", "?from=2025-01-01&to=2026-11-04", "?from=x&to=y"]) {
      expect((await call("GET", "/brand/report" + q, { cookie })).status).toBe(400);
    }
  });
});

describe("cdn.doorbell.life", () => {
  it("serves brand JSON and assets from R2 with content-type, cache headers, CORS and nosniff", async () => {
    const cookie = await login("cdn@example.com");
    const { id } = (await (await call("GET", "/brand", { cookie })).json()) as { id: string };
    const up = await call("POST", "/brand/assets", { cookie, body: PNG, headers: { "Content-Type": "image/png" } });
    const { url } = (await up.json()) as { url: string };
    await call("PUT", "/brand/settings", {
      cookie,
      json: { template: "bell", primary: "oklch(0.5 0.12 250)", font: "Noto Serif TC", name: "測試", logo: url },
    });

    const j = await cdn("GET", `/b/${id}.json`);
    expect(j.status).toBe(200);
    expect(j.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(j.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(j.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(j.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(j.headers.get("Set-Cookie")).toBeNull();
    const etag = j.headers.get("ETag")!;
    expect(etag).toMatch(/^"/);
    expect(((await j.json()) as { n: string }).n).toBe("測試");

    const again = await cdn("GET", `/b/${id}.json`, { headers: { "If-None-Match": etag } });
    expect(again.status).toBe(304);
    expect(again.headers.get("ETag")).toBe(etag);

    const img = await cdn("GET", url.slice("https://cdn.doorbell.life".length));
    expect(img.status).toBe(200);
    expect(img.headers.get("Content-Type")).toBe("image/png");
    expect(img.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(img.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await img.arrayBuffer())).toEqual(PNG);

    const head = await cdn("HEAD", `/b/${id}.json`);
    expect(head.status).toBe(200);
    expect(head.headers.get("Content-Length")).toMatch(/^\d+$/);
    expect(await head.text()).toBe("");
  });

  it("serves only brand keys, read-only, and keeps /auth and /brand off the cdn host", async () => {
    await env.CDN.put("b/secret.txt", "x");
    await env.CDN.put(`b/${"a".repeat(24)}/notes.html`, "<script>");
    for (const p of [`/b/${"0".repeat(24)}.json`, "/b/secret.txt", `/b/${"a".repeat(24)}/notes.html`, "/b/../x", "/auth/request", "/brand", "/widget.js"]) {
      const res = await cdn("GET", p);
      expect(res.status, p).toBe(404);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    }
    expect((await cdn("PUT", `/b/${"0".repeat(24)}.json`)).status).toBe(405);
    expect((await cdn("POST", "/auth/request", { json: { email: "x@example.com" } })).status).toBe(404);
    expect(mails).toHaveLength(0);
    // /s 只在 cdn 主機
    expect((await call("POST", "/s?h=api-host.example.com&k=blood")).status).toBe(404);
    expect(await count("api-host.example.com")).toBe(0);
  });
});
