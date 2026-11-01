// doorbell.life：給 Cloudflare 免費方案用的 Worker，擋在網站前面。
// 網站回傳 5xx 或完全連不上時，改回應 doorbell.life 的離線錯誤頁，狀態碼維持原本的值（連不上時回 502）。
// 注意：每個請求都會經過這個 Worker，會計入你自己帳號的 Workers 每日免費額度。
// 設定：REGION 改成你的地區（例如 taiwan）。

const REGION = "taiwan";
const BASE = "https://cdn.doorbell.life/t";
const CODES = new Set([500, 501, 502, 503, 504]);

async function errorPage(status, retryAfter) {
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
  if (retryAfter) headers["retry-after"] = retryAfter; // 保留網站給的重試時間
  try {
    const res = await fetch(`${BASE}/${REGION}/${status}.html`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (res.ok) return new Response(res.body, { status, headers });
  } catch {}
  // 範本也拿不到時，回最簡單的文字說明，仍維持原本的狀態碼。
  return new Response("Service temporarily unavailable.", { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export default {
  async fetch(request) {
    let res;
    try {
      res = await fetch(request);
    } catch {
      return errorPage(502);
    }
    const accept = request.headers.get("accept") || "";
    // 只替換網頁請求；API 的 JSON 錯誤不在範圍內，原樣回傳。
    if (CODES.has(res.status) && accept.includes("text/html")) return errorPage(res.status, res.headers.get("retry-after"));
    return res;
  },
};
