// 路由與處理程序。契約見 ../API.md；原則見 CLAUDE.md §3（不存 IP、不設訪客 cookie、/s 永遠 204）。
import { brandObject, cdnEmpty } from "./cdn.ts";
import { hex, randomId, randomToken, sameHash, sha256 } from "./crypto.ts";
import { DnsError, txtRecords } from "./dns.ts";
import {
  clearSessionCookie,
  empty,
  error,
  json,
  preflight,
  readBody,
  readCookie,
  readJson,
  SESSION_COOKIE,
  SESSION_DAYS,
  sessionCookie,
  TooLarge,
  withCors,
} from "./http.ts";
import { loginMail, type Mailer } from "./mailer.ts";
import * as v from "./validate.ts";

export interface Deps {
  mailer: Mailer;
  now: () => number;
  /** 查 DNS over HTTPS 用的 fetch；測試時換成假的。預設是全域 fetch。 */
  dohFetch?: typeof fetch;
}

export type Req = Request<unknown, IncomingRequestCfProperties>;

export const SAMPLING = 10;
export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const RATE_WINDOW_MS = 15 * 60 * 1000;
export const RATE_MAX = 3;
// 全站每天最多寄出的登入信（Resend 免費方案每天 100 封；退信率過高會被停權，防止有人灌不存在的信箱）
export const GLOBAL_DAILY_MAX = 90;
export const MAX_ASSET_BYTES = 200_000; // 與前端 site/src/lib/brand.ts 的 MAX_IMAGE_BYTES 一致
export const MAX_REPORT_DAYS = 366;
const DAY_MS = 86400 * 1000;

const log = (event: string, extra: Record<string, unknown> = {}) => console.error(JSON.stringify({ event, ...extra }));

export async function handle(req: Req, env: Env, ctx: ExecutionContext, deps: Deps): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // cdn.doorbell.life：只有 /s 與 /b/ 會進到 Worker 程式，其餘由靜態資源提供（wrangler.jsonc 的 assets）
  if (url.host === new URL(env.CDN_BASE).host) {
    if (path === "/s") return impression(req, url, env, ctx, deps);
    if (path.startsWith("/b/")) return brandObject(req, path, env.CDN);
    return cdnEmpty(404);
  }

  // api.doorbell.life（本機開發時的其他主機名稱也走這裡）
  if (path.startsWith("/auth/") || path === "/brand" || path.startsWith("/brand/")) {
    const origin = req.headers.get("Origin");
    const allowed = env.SITE_ORIGIN;
    if (req.method === "OPTIONS") return preflight(origin, allowed);
    // 會改變狀態的請求：瀏覽器帶來的 Origin 必須是官網本身
    if (req.method !== "GET" && origin !== null && origin !== allowed) return error("forbidden_origin", 403);
    let res: Response;
    try {
      res = await api(req, url, env, ctx, deps);
    } catch (e) {
      if (e instanceof TooLarge) res = error("too_large", 413);
      else {
        log("internal_error", { path, message: e instanceof Error ? e.message : String(e) });
        res = error("internal", 500);
      }
    }
    return withCors(res, origin, allowed);
  }

  return error("not_found", 404);
}

// ── 曝光統計 ────────────────────────────────────────────

const UPSERT_IMPRESSION =
  "INSERT INTO impressions (host, date, topic, country, count) VALUES (?1, ?2, ?3, ?4, 1) " +
  "ON CONFLICT (host, date, topic, country) DO UPDATE SET count = count + 1";

function impression(req: Req, url: URL, env: Env, ctx: ExecutionContext, deps: Deps): Response {
  // 元件用 sendBeacon（POST）送；也接受 GET。不讀 body、不設 cookie、不碰 IP，任何情況都回 204。
  if (req.method === "GET" || req.method === "POST") {
    const h = v.host(url.searchParams.get("h"));
    const k = v.topic(url.searchParams.get("k"));
    if (h && k) {
      const date = new Date(deps.now()).toISOString().slice(0, 10);
      const c = v.country(req.cf?.country);
      ctx.waitUntil(
        env.DB.prepare(UPSERT_IMPRESSION)
          .bind(h, date, k, c)
          .run()
          .then(
            () => undefined,
            (e: unknown) => log("impression_write_failed", { message: e instanceof Error ? e.message : String(e) }),
          ),
      );
    }
  }
  return empty(204);
}

// ── 登入、品牌、報表 ────────────────────────────────────

async function api(req: Req, url: URL, env: Env, ctx: ExecutionContext, deps: Deps): Promise<Response> {
  const route = `${req.method} ${url.pathname}`;
  switch (route) {
    case "POST /auth/request":
      return authRequest(req, env, ctx, deps);
    case "POST /auth/verify":
      return authVerify(req, env, deps);
    case "POST /auth/logout":
      return authLogout(req, env);
  }

  const known = [
    "GET /brand",
    "PUT /brand/settings",
    "PUT /brand/sites",
    "POST /brand/sites/verify",
    "POST /brand/assets",
    "GET /brand/report",
    "GET /brand/report.csv",
  ];
  if (!known.includes(route)) return error("not_found", 404);

  const brandId = await currentBrand(req, env, deps);
  if (!brandId) return error("unauthorized", 401);

  switch (route) {
    case "GET /brand":
      return getBrand(env, brandId);
    case "PUT /brand/settings":
      return putSettings(req, env, brandId);
    case "PUT /brand/sites":
      return putSites(req, env, brandId);
    case "POST /brand/sites/verify":
      return verifySite(req, env, brandId, deps);
    case "POST /brand/assets":
      return postAsset(req, env, brandId);
    case "GET /brand/report":
      return report(url, env, brandId, "json");
    default:
      return report(url, env, brandId, "csv");
  }
}

async function authRequest(req: Req, env: Env, ctx: ExecutionContext, deps: Deps): Promise<Response> {
  const body = await readJson(req);
  const email = v.email(isObj(body) ? body.email : undefined);
  if (!email) return error("invalid_email", 400);

  const now = deps.now();
  const token = randomToken();
  const hash = await sha256(token);
  // 限流與新增在同一個敘述裡完成，避免同時多個請求一起穿過檢查。帳號存不存在完全不影響這段流程。
  const [, inserted] = await env.DB.batch([
    env.DB.prepare("DELETE FROM login_tokens WHERE created_at < ?1").bind(now - DAY_MS),
    env.DB.prepare(
      "INSERT INTO login_tokens (hash, email, created_at, expires_at) SELECT ?1, ?2, ?3, ?4 " +
        "WHERE (SELECT COUNT(*) FROM login_tokens WHERE email = ?2 AND created_at > ?5) < ?6 " +
        "AND (SELECT COUNT(*) FROM login_tokens WHERE created_at > ?7) < ?8",
    ).bind(hash, email, now, now + TOKEN_TTL_MS, now - RATE_WINDOW_MS, RATE_MAX, now - DAY_MS, GLOBAL_DAILY_MAX),
  ]);
  if (!inserted || inserted.meta.changes !== 1) return error("rate_limited", 429, { "Retry-After": "900" });

  const link = `${env.SITE_ORIGIN}/brand/login/?token=${token}`;
  ctx.waitUntil(
    deps.mailer.send(loginMail(email, link)).catch((e: unknown) =>
      // 不記信箱：只記錯誤代碼
      log("mail_failed", { code: isObj(e) && typeof e.code === "string" ? e.code : "unknown" }),
    ),
  );
  return json({ ok: true }, 202);
}

async function authVerify(req: Req, env: Env, deps: Deps): Promise<Response> {
  const body = await readJson(req);
  const token = v.token(isObj(body) ? body.token : undefined);
  if (!token) return error("invalid_token", 400);

  const now = deps.now();
  const hash = await sha256(token);
  // 標記已用與檢查到期在同一個敘述完成：同一個 token 只會成功一次
  const row = await env.DB.prepare(
    "UPDATE login_tokens SET used_at = ?1 WHERE hash = ?2 AND used_at IS NULL AND expires_at > ?1 RETURNING hash, email",
  )
    .bind(now, hash)
    .first<{ hash: string; email: string }>();
  if (!row || !sameHash(row.hash, hash)) {
    // 只告訴持有 token 的人失敗原因：用過（used）、過期（expired）、不認得（invalid_token）
    const why = await env.DB.prepare("SELECT used_at, expires_at FROM login_tokens WHERE hash = ?1")
      .bind(hash)
      .first<{ used_at: number | null; expires_at: number }>();
    return error(!why ? "invalid_token" : why.used_at !== null ? "used" : "expired", 400);
  }

  const sessionToken = randomToken();
  const sessionHash = await sha256(sessionToken);
  const [, brand] = await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO brands (id, email, created_at, verify_code) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (email) DO NOTHING",
    ).bind(randomId(), row.email, now, newVerifyCode()),
    env.DB.prepare("SELECT id FROM brands WHERE email = ?1").bind(row.email),
  ]);
  const brandId = (brand?.results[0] as { id: string } | undefined)?.id;
  if (!brandId) throw new Error("brand_missing");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?1").bind(now),
    env.DB.prepare("INSERT INTO sessions (hash, brand_id, expires_at) VALUES (?1, ?2, ?3)").bind(
      sessionHash,
      brandId,
      now + SESSION_DAYS * DAY_MS,
    ),
  ]);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(sessionToken) });
}

async function authLogout(req: Req, env: Env): Promise<Response> {
  const token = v.token(readCookie(req, SESSION_COOKIE));
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE hash = ?1").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

async function currentBrand(req: Req, env: Env, deps: Deps): Promise<string | null> {
  const token = v.token(readCookie(req, SESSION_COOKIE));
  if (!token) return null;
  const hash = await sha256(token);
  const row = await env.DB.prepare("SELECT hash, brand_id, expires_at FROM sessions WHERE hash = ?1")
    .bind(hash)
    .first<{ hash: string; brand_id: string; expires_at: number }>();
  if (!row || !sameHash(row.hash, hash) || row.expires_at <= deps.now()) return null;
  return row.brand_id;
}

export interface Settings {
  template: v.Template;
  primary: string;
  font: v.Font;
  name: string;
  logo?: string;
  mascot?: string;
}

export interface Site {
  host: string;
  verified: boolean;
  /** 要放進 `_doorbell-life.{host}` TXT 紀錄的值 */
  txt: string;
}

const newVerifyCode = () => hex(crypto.getRandomValues(new Uint8Array(16)));
export const txtValue = (code: string) => `doorbell-life-verify=${code}`;

async function listSites(env: Env, brandId: string): Promise<{ brand: BrandRow; sites: Site[] } | null> {
  const [b, s] = await env.DB.batch([
    env.DB.prepare("SELECT id, email, settings, verify_code FROM brands WHERE id = ?1").bind(brandId),
    env.DB.prepare("SELECT host, verified_at FROM sites WHERE brand_id = ?1 ORDER BY host").bind(brandId),
  ]);
  const brand = b?.results[0] as BrandRow | undefined;
  if (!brand) return null;
  const txt = txtValue(brand.verify_code);
  const sites = ((s?.results ?? []) as { host: string; verified_at: number | null }[]).map((r) => ({
    host: r.host,
    verified: r.verified_at !== null,
    txt,
  }));
  return { brand, sites };
}

interface BrandRow {
  id: string;
  email: string;
  settings: string | null;
  verify_code: string;
}

async function getBrand(env: Env, brandId: string): Promise<Response> {
  const r = await listSites(env, brandId);
  if (!r) return error("unauthorized", 401);
  return json({
    id: r.brand.id,
    email: r.brand.email,
    settings: r.brand.settings ? (JSON.parse(r.brand.settings) as Settings) : null,
    sites: r.sites,
  });
}

async function putSettings(req: Req, env: Env, brandId: string): Promise<Response> {
  const body = await readJson(req);
  if (!isObj(body)) return error("invalid_body", 400);
  const template = typeof body.template === "string" && (v.TEMPLATES as readonly string[]).includes(body.template)
    ? (body.template as v.Template)
    : null;
  if (!template) return error("invalid_template", 400);
  const primary = v.primary(body.primary);
  if (!primary) return error("invalid_primary", 400);
  const font = typeof body.font === "string" && Object.hasOwn(v.FONTS, body.font) ? (body.font as v.Font) : null;
  if (!font) return error("invalid_font", 400);
  const name = v.name(body.name);
  if (!name) return error("invalid_name", 400);

  const settings: Settings = { template, primary: primary.oklch, font, name };
  for (const key of ["logo", "mascot"] as const) {
    if (body[key] === undefined || body[key] === null) continue;
    const u = v.assetUrl(body[key], env.CDN_BASE, brandId);
    if (!u) return error(`invalid_${key}`, 400);
    // 只收真的上傳過的素材
    if (!(await env.CDN.head(u.slice(env.CDN_BASE.length + 1)))) return error(`invalid_${key}`, 400);
    settings[key] = u;
  }

  await env.DB.prepare("UPDATE brands SET settings = ?1 WHERE id = ?2").bind(JSON.stringify(settings), brandId).run();
  const published = publishedJson(settings, primary.hex);
  await env.CDN.put(`b/${brandId}.json`, JSON.stringify(published), {
    httpMetadata: { contentType: "application/json; charset=utf-8", cacheControl: "public, max-age=300" },
  });
  return json({ settings, published: `${env.CDN_BASE}/b/${brandId}.json` });
}

/** 元件讀的靜態檔：`{ t, v: { brand, brand-o }, n, logo? }`（API.md）。 */
export function publishedJson(s: Settings, hex: string) {
  return {
    t: s.template,
    v: { brand: hex, "brand-o": s.primary },
    n: s.name,
    ...(s.logo ? { logo: s.logo } : {}),
  };
}

async function putSites(req: Req, env: Env, brandId: string): Promise<Response> {
  const body = await readJson(req, 16 * 1024);
  const sites = v.sites(isObj(body) ? body.sites : undefined);
  if (!sites) return error("invalid_sites", 400);
  // 整份取代，但清單裡原本就有的網域保留驗證狀態
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sites WHERE brand_id = ?1 AND host NOT IN (SELECT value FROM json_each(?2))").bind(
      brandId,
      JSON.stringify(sites),
    ),
    ...sites.map((h) =>
      env.DB.prepare("INSERT INTO sites (brand_id, host) VALUES (?1, ?2) ON CONFLICT (brand_id, host) DO NOTHING").bind(
        brandId,
        h,
      ),
    ),
  ]);
  const r = await listSites(env, brandId);
  if (!r) return error("unauthorized", 401);
  return json({ sites: r.sites });
}

// DNS 名稱最長 253 字元；加上前綴後超過就不可能有這筆紀錄
const VERIFY_PREFIX = "_doorbell-life.";

async function verifySite(req: Req, env: Env, brandId: string, deps: Deps): Promise<Response> {
  const body = await readJson(req);
  const host = v.host(isObj(body) ? body.host : undefined);
  if (!host) return error("invalid_host", 400);
  const r = await listSites(env, brandId);
  if (!r) return error("unauthorized", 401);
  const site = r.sites.find((s) => s.host === host);
  if (!site) return error("unknown_site", 404);

  let verified = false;
  if (VERIFY_PREFIX.length + host.length <= 253) {
    try {
      const values = await txtRecords(VERIFY_PREFIX + host, deps.dohFetch ?? fetch);
      verified = values.some((t) => t.trim() === site.txt);
    } catch (e) {
      if (!(e instanceof DnsError)) throw e;
      log("dns_failed", { reason: e.message });
      return error("dns_unavailable", 502);
    }
  }
  // 結果反映 DNS 現況：找到就標記已驗證（保留第一次驗證的時間），找不到就改回未驗證
  await env.DB.prepare(
    "UPDATE sites SET verified_at = CASE WHEN ?3 THEN COALESCE(verified_at, ?4) ELSE NULL END WHERE brand_id = ?1 AND host = ?2",
  )
    .bind(brandId, host, verified ? 1 : 0, deps.now())
    .run();
  return json({ host, verified });
}

async function postAsset(req: Req, env: Env, brandId: string): Promise<Response> {
  // 宣告的 Content-Type 必須是 PNG 或 WebP（也讓跨站請求一定要先過 CORS preflight），而且要跟檔頭一致
  const declared = v.declaredImageType(req.headers.get("Content-Type"));
  if (!declared) return error("unsupported_type", 415);
  const bytes = await readBody(req, MAX_ASSET_BYTES);
  if (bytes.byteLength === 0) return error("empty", 400);
  const type = v.imageType(bytes); // 看檔頭，不只信 Content-Type
  if (type !== declared) return error("unsupported_type", 415);
  const key = `b/${brandId}/${await sha256(bytes)}.${type}`;
  await env.CDN.put(key, bytes, {
    httpMetadata: { contentType: `image/${type}`, cacheControl: "public, max-age=31536000, immutable" },
  });
  return json({ url: `${env.CDN_BASE}/${key}` }, 201);
}

interface ReportRow {
  date: string;
  topic: string;
  country: string;
  impressions: number;
}

async function report(url: URL, env: Env, brandId: string, format: "json" | "csv"): Promise<Response> {
  const from = v.date(url.searchParams.get("from"));
  const to = v.date(url.searchParams.get("to"));
  if (!from || !to || from > to) return error("invalid_range", 400);
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS >= MAX_REPORT_DAYS) return error("invalid_range", 400);

  const { results } = await env.DB.prepare(
    "SELECT i.date AS date, i.topic AS topic, i.country AS country, SUM(i.count) * ?4 AS impressions " +
      "FROM sites s JOIN impressions i ON i.host = s.host " +
      "WHERE s.brand_id = ?1 AND s.verified_at IS NOT NULL AND i.date BETWEEN ?2 AND ?3 " +
      "GROUP BY i.date, i.topic, i.country ORDER BY i.date, i.topic, i.country",
  )
    .bind(brandId, from, to, SAMPLING)
    .all<ReportRow>();

  if (format === "json") return json({ sampling: SAMPLING, from, to, rows: results });

  // 欄位都經過白名單（日期、議題、國家碼、整數），不會有逗號、引號或公式字元
  const lines = ["date,topic,country,impressions", ...results.map((r) => `${r.date},${r.topic},${r.country},${r.impressions}`)];
  return new Response(String.fromCharCode(0xfeff) + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doorbell-report-${from}-${to}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
