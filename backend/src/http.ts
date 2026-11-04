// 回應一律 JSON（CSV 例外），不快取；只有網站本身的來源可帶 cookie 呼叫 /auth/*、/brand/*。
export const SESSION_COOKIE = "dbl_session";
export const SESSION_DAYS = 30;

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(BASE_HEADERS)) h.set(k, v);
  return new Response(JSON.stringify(body), { status, headers: h });
}

export const error = (code: string, status: number, headers?: HeadersInit) => json({ error: code }, status, headers);

export function empty(status: number, headers: HeadersInit = {}): Response {
  const h = new Headers(headers);
  for (const [k, v] of Object.entries(BASE_HEADERS)) h.set(k, v);
  return new Response(null, { status, headers: h });
}

/** 在回應上加 CORS（只對允許的來源）。 */
export function withCors(res: Response, origin: string | null, allowed: string): Response {
  if (origin !== allowed) return res;
  const r = new Response(res.body, res);
  r.headers.set("Access-Control-Allow-Origin", allowed);
  r.headers.set("Access-Control-Allow-Credentials", "true");
  r.headers.append("Vary", "Origin");
  return r;
}

export function preflight(origin: string | null, allowed: string): Response {
  if (origin !== allowed) return empty(403);
  return empty(204, {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearSessionCookie = () => `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("Cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export class TooLarge extends Error {}

/** 讀 body，超過 max bytes 就丟 TooLarge；不整包相信 Content-Length。 */
export async function readBody(req: Request, max: number): Promise<Uint8Array> {
  const len = Number(req.headers.get("Content-Length"));
  if (len > max) throw new TooLarge();
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new TooLarge();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

/** 讀 JSON body（限 Content-Type: application/json，迫使跨站請求必須先過 CORS preflight）。 */
export async function readJson(req: Request, max = 4096): Promise<unknown> {
  const ct = req.headers.get("Content-Type") ?? "";
  if (!/^application\/json\b/i.test(ct)) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(await readBody(req, max)));
  } catch (e) {
    if (e instanceof TooLarge) throw e;
    return undefined;
  }
}
