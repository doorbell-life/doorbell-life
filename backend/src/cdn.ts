// cdn.doorbell.life 上由 Worker 程式處理的部分：/b/ 品牌設定與素材（R2）。
// 其餘路徑（widget.js、w.css、d/、z/、t/）由 Workers 靜態資源直接提供，不會進到這裡（wrangler.jsonc 的 assets）。
// 元件從任何網站跨來源讀取，所以一律帶 Access-Control-Allow-Origin: *；不設 cookie。

// 只提供本服務自己寫進 R2 的兩種物件：b/{品牌}.json、b/{品牌}/{sha256}.{png|webp}
const KEY = /^b\/[0-9a-f]{24}(?:\.json|\/[0-9a-f]{64}\.(png|webp))$/;

export const BRAND_JSON_CACHE = "public, max-age=300";
export const ASSET_CACHE = "public, max-age=31536000, immutable";

const BASE = {
  "Access-Control-Allow-Origin": "*",
  "X-Content-Type-Options": "nosniff",
};

export function cdnEmpty(status: number, extra: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { ...BASE, "Cache-Control": "no-store", ...extra } });
}

export async function brandObject(req: Request, path: string, bucket: R2Bucket): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") return cdnEmpty(405, { Allow: "GET, HEAD" });
  const key = path.slice(1);
  const m = KEY.exec(key);
  if (!m) return cdnEmpty(404);

  const obj = req.method === "HEAD" ? await bucket.head(key) : await bucket.get(key, { onlyIf: req.headers });
  if (!obj) return cdnEmpty(404);

  // Content-Type 由路徑決定，不讀物件裡存的值
  const headers = new Headers({
    ...BASE,
    "Content-Type": m[1] ? `image/${m[1]}` : "application/json; charset=utf-8",
    "Cache-Control": m[1] ? ASSET_CACHE : BRAND_JSON_CACHE,
    ETag: obj.httpEtag,
  });
  headers.set("Content-Length", String(obj.size));
  if (req.method === "HEAD") return new Response(null, { status: 200, headers });
  if (!hasBody(obj)) {
    headers.delete("Content-Length");
    return new Response(null, { status: 304, headers }); // If-None-Match 等條件不成立
  }
  return new Response(obj.body, { status: 200, headers });
}

// get() 帶 onlyIf 時，條件不成立會回沒有 body 的 R2Object
function hasBody(o: R2Object | R2ObjectBody): o is R2ObjectBody {
  return "body" in o;
}
