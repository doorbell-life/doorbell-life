// 所有輸入一律白名單驗證。驗證失敗回 null，由呼叫端決定回應。
import { TOPICS, type Topic } from "@doorbell-life/schema";
import { oklchToHex } from "./oklch.ts";

const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const HOST = new RegExp(`^${LABEL}(?:\\.${LABEL})*$`);

/** 主機名稱：最長 253，只含 a-z0-9.-，每段 1–63 字、不以 - 開頭結尾。 */
export function host(v: unknown): string | null {
  return typeof v === "string" && v.length <= 253 && HOST.test(v) ? v : null;
}

export function topic(v: unknown): Topic | null {
  return typeof v === "string" && (TOPICS as readonly string[]).includes(v) ? (v as Topic) : null;
}

/** Cloudflare 邊緣給的國家碼；取不到或格式不對就記 XX（T1 = Tor 照記）。 */
export function country(v: unknown): string {
  return typeof v === "string" && /^[A-Z0-9]{2}$/.test(v) ? v : "XX";
}

// 只檢查形狀，不追求 RFC 5322 全集；小寫化後比對。
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
export function email(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

/** 32 bytes 的 base64url（43 字）。 */
export function token(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v) ? v : null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function date(v: unknown): string | null {
  if (typeof v !== "string" || !DATE.test(v)) return null;
  const d = new Date(v + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

export const TEMPLATES = ["bell", "full-image", "one-line"] as const;
export type Template = (typeof TEMPLATES)[number];

/** 字型白名單：鍵 → 實際字型堆疊。 */
export const FONTS = {
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  "noto-sans-tc": '"Noto Sans TC", system-ui, sans-serif',
  "noto-serif-tc": '"Noto Serif TC", serif',
} as const;
export type Font = keyof typeof FONTS;

export interface Primary {
  oklch: string; // 正規化後的 oklch(L C H)
  hex: string;
}

const NUM = "(\\d+(?:\\.\\d+)?|\\.\\d+)";
const OKLCH = new RegExp(`^oklch\\(\\s*${NUM}\\s+${NUM}\\s+${NUM}\\s*\\)$`);
/** oklch(L C H)：L 0.45–0.55（淺底對比），C 0–0.4，H 0–360。 */
export function primary(v: unknown): Primary | null {
  if (typeof v !== "string" || v.length > 64) return null;
  const m = OKLCH.exec(v.trim());
  if (!m) return null;
  const [L, C, H] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!(L >= 0.45 && L <= 0.55 && C >= 0 && C <= 0.4 && H >= 0 && H <= 360)) return null;
  const r = (x: number) => +x.toFixed(4);
  return { oklch: `oklch(${r(L)} ${r(C)} ${r(H)})`, hex: oklchToHex(L, C, H) };
}

// 控制字元、雙向文字控制字元、零寬字元，以及角括號：一律拒收（品牌名稱只當純文字，仍不收可疑字元）。
const BAD_TEXT = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff<>]/;
export function name(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.trim();
  return n.length >= 1 && n.length <= 60 && !BAD_TEXT.test(n) ? n : null;
}

/** 品牌素材網址：只收本服務上傳產生、屬於這個品牌的網址。 */
export function assetUrl(v: unknown, cdnBase: string, brandId: string): string | null {
  if (typeof v !== "string") return null;
  const prefix = `${cdnBase}/b/${brandId}/`;
  if (!v.startsWith(prefix)) return null;
  return /^[0-9a-f]{64}\.(png|webp)$/.test(v.slice(prefix.length)) ? v : null;
}

export const MAX_SITES = 50;
export function sites(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > MAX_SITES) return null;
  const out = new Set<string>();
  for (const s of v) {
    const h = host(s);
    if (!h) return null;
    out.add(h);
  }
  return [...out].sort();
}

/** 圖片類型以檔頭判斷，不信任 Content-Type。只收 PNG、WebP。 */
export function imageType(b: Uint8Array): "png" | "webp" | null {
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((x, i) => b[i] === x)) return "png";
  const ascii = (o: number, s: string) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));
  if (b.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  return null;
}
