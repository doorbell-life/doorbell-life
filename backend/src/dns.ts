// 用 Cloudflare DNS over HTTPS（JSON 格式）查 TXT 紀錄。
// 格式（2026-11-04 依官方文件與實際查詢確認）：GET https://cloudflare-dns.com/dns-query?name=...&type=TXT，
// 標頭 accept: application/dns-json；回應 { Status, Answer: [{ name, type, TTL, data }] }。
// Status 0 = NOERROR、3 = NXDOMAIN。TXT 的 data 是加了引號的字串，超過 255 字元的紀錄會拆成多段："abc" "def"。
export const DOH_URL = "https://cloudflare-dns.com/dns-query";
const TXT_TYPE = 16;
const NOERROR = 0;
const NXDOMAIN = 3;

export class DnsError extends Error {}

/** 把 DoH 的 TXT data（一或多段加引號的字串）還原成一個字串。 */
export function parseTxt(data: string): string {
  const parts = [...data.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return parts.length ? parts.join("") : data;
}

/** 查 name 的所有 TXT 值。名稱不存在回空陣列；查詢本身失敗（連線、逾時、SERVFAIL 等）丟 DnsError。 */
export async function txtRecords(name: string, fetchFn: typeof fetch): Promise<string[]> {
  let res: Response;
  try {
    res = await fetchFn(`${DOH_URL}?name=${encodeURIComponent(name)}&type=TXT`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new DnsError("fetch_failed");
  }
  if (!res.ok) throw new DnsError(`http_${res.status}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new DnsError("bad_json");
  }
  const o = body as { Status?: unknown; Answer?: unknown } | null;
  if (o?.Status === NXDOMAIN) return [];
  if (o?.Status !== NOERROR) throw new DnsError(`status_${String(o?.Status)}`);
  if (!Array.isArray(o.Answer)) return [];
  // 只取 TXT（CNAME 等其他類型的答案略過）
  return o.Answer.filter(
    (a): a is { type: number; data: string } => a?.type === TXT_TYPE && typeof a?.data === "string",
  ).map((a) => parseTxt(a.data));
}
