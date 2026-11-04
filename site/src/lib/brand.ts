// 品牌主後台（/brand/）的前端共用程式：呼叫 backend API（契約見 backend/API.md），以及樣式設計器用的色彩計算。
// 只在瀏覽器執行。所有 API 回傳的資料一律用 textContent 放進畫面（CLAUDE.md §3 第 1 條）。

export const API = String(import.meta.env.PUBLIC_API_BASE || "https://api.doorbell.life").replace(/\/+$/, "");
export const CDN = "https://cdn.doorbell.life/";

export const TEMPLATES = [
  { id: "bell", label: "門鈴燈", hint: "預設。卡片左上角一顆主色圓點，像門鈴亮了" },
  { id: "full-image", label: "滿版圖", hint: "照片放大到卡片全寬，適合動物議題" },
  { id: "one-line", label: "簡潔一行", hint: "只佔一行，適合版面很擠的錯誤頁" },
] as const;
export type Template = (typeof TEMPLATES)[number]["id"];

// 字型白名單（backend/API.md）。值就是送給 API 的字串。
export const FONTS = [
  { id: "system", label: "系統預設字型", stack: "" },
  { id: "Noto Sans TC", label: "思源黑體（Noto Sans TC）", stack: '"Noto Sans TC", sans-serif' },
  { id: "Noto Serif TC", label: "思源宋體（Noto Serif TC）", stack: '"Noto Serif TC", serif' },
] as const;
export type Font = (typeof FONTS)[number]["id"];

export const TOPIC_LABELS: Record<string, string> = {
  "missing-elders": "失智走失長者",
  "missing-children": "失蹤兒少",
  "missing-adults": "失蹤成人",
  blood: "捐血",
  "animals-lost": "走失毛孩",
  "animals-adopt": "待認養動物",
  stats: "宣導數字",
};
export const TOPIC_ORDER = Object.keys(TOPIC_LABELS);

export const L_MIN = 0.45;
export const L_MAX = 0.55;
export const C_MAX = 0.2;
export const MAX_IMAGE_BYTES = 200_000; // 200KB，用十進位算，比伺服器寬鬆時也不會多傳
export const IMAGE_TYPES = ["image/png", "image/webp"];

export interface Settings {
  template: Template;
  primary: string;
  font: Font;
  name: string;
  logo?: string;
  mascot?: string;
}
export interface Site { host: string; verified: boolean; txt: string }
export interface Brand { id: string; email: string; settings: Partial<Settings> | null; sites: Site[] }
export interface ReportRow { date: string; topic: string; country: string; impressions: number }

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

// 需要登入的呼叫：401 一律送回 /brand/ 重新登入。
export async function call(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(API + path, { credentials: "include", ...init });
  } catch {
    throw new ApiError(0, "network");
  }
  if (res.status === 401) {
    location.replace("/brand/");
    throw new ApiError(401, "unauthorized");
  }
  if (!res.ok) throw new ApiError(res.status, await errorCode(res));
  return res;
}

export async function errorCode(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : "unknown";
  } catch {
    return "unknown";
  }
}

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function errorText(e: unknown): string {
  if (e instanceof ApiError && e.status === 0) return "連不上伺服器，請確認網路後再試一次。";
  if (e instanceof ApiError && e.status === 429) return "操作太頻繁，請過幾分鐘再試。";
  return "伺服器暫時出了問題，請稍後再試。";
}

export function setMsg(el: Element | null, text: string, kind: "ok" | "err" | "" = "") {
  if (!el) return;
  el.textContent = text;
  el.className = "msg" + (kind ? " " + kind : "");
}

// ── 網域 ──

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
// 接受使用者貼上的網址或網域，轉成主機名稱；不合法回 null。規則與 API 的 /s 一致：最長 253、只含 a-z0-9.-。
export function normalizeHost(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (s.length > 253 || !/^[a-z0-9.-]+$/.test(s)) return null;
  const labels = s.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return null;
  return s;
}

export function parseSites(text: string): { sites: string[]; bad: string[] } {
  const sites: string[] = [];
  const bad: string[] = [];
  for (const line of text.split(/[\n,，\s]+/)) {
    if (!line.trim()) continue;
    const h = normalizeHost(line);
    if (!h) bad.push(line.trim());
    else if (!sites.includes(h)) sites.push(h);
  }
  return { sites, bad };
}

// ── 色彩（OKLCH → sRGB，算對比） ──

export interface Oklch { l: number; c: number; h: number }

export function parseOklch(s: string | undefined | null): Oklch | null {
  const m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/i.exec(String(s ?? "").trim());
  if (!m) return null;
  const l = m[2] ? +m[1] / 100 : +m[1];
  const v = { l, c: +m[3], h: +m[4] % 360 };
  return [v.l, v.c, v.h].every(Number.isFinite) ? v : null;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
export const formatOklch = ({ l, c, h }: Oklch) => `oklch(${r3(l)} ${r3(c)} ${Math.round(h * 10) / 10})`;
export const inRange = ({ l, c }: Oklch) => l >= L_MIN - 1e-9 && l <= L_MAX + 1e-9 && c >= 0 && c <= C_MAX + 1e-9;

// 線性 sRGB，可能超出 0–1（超出色域）
export function toLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}

export const inGamut = (o: Oklch) => toLinearRgb(o).every((v) => v >= -0.001 && v <= 1.001);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function toHex(o: Oklch): string {
  const enc = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  return "#" + toLinearRgb(o).map((v) => Math.round(clamp01(enc(clamp01(v))) * 255).toString(16).padStart(2, "0")).join("");
}

export function luminance(o: Oklch): number {
  const [r, g, b] = toLinearRgb(o).map(clamp01);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const contrast = (x: Oklch, y: Oklch) => {
  const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
};

export const CARD_BG: Oklch = { l: 0.97, c: 0.005, h: 250 }; // widget/src/w.css 的 --dbl-bg
export const WHITE: Oklch = { l: 1, c: 0, h: 0 };
export const DEFAULT_PRIMARY: Oklch = { l: 0.5, c: 0.12, h: 250 };

// ── 圖片 ──

// 檢查類型、大小與檔頭（不只看副檔名）。通過回 null，否則回給使用者看的說明。
export async function checkImage(file: File): Promise<string | null> {
  if (!IMAGE_TYPES.includes(file.type)) return "只能上傳 PNG 或 WebP 圖檔。";
  if (file.size > MAX_IMAGE_BYTES) return "檔案超過 200KB，請先壓縮再上傳。";
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b);
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (!(file.type === "image/png" ? png : webp)) return "檔案內容不是 PNG 或 WebP，請換一個檔案。";
  return null;
}

export const isCdnUrl = (u: unknown): u is string => typeof u === "string" && u.startsWith(CDN);

// ── 報表 ──

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function sortRows(rows: ReportRow[]): ReportRow[] {
  const t = (k: string) => (TOPIC_ORDER.includes(k) ? TOPIC_ORDER.indexOf(k) : 99);
  return [...rows].sort((a, b) => a.date.localeCompare(b.date) || t(a.topic) - t(b.topic) || a.country.localeCompare(b.country));
}

// 回應可能是 { rows, sampling } 或直接是陣列（API.md 寫「回傳陣列，回應附 sampling」，兩種都接受）。
export function readReport(body: unknown): { rows: ReportRow[]; sampling: number } {
  const o = body as { rows?: unknown; items?: unknown; sampling?: unknown } | unknown[];
  const raw = Array.isArray(o) ? o : Array.isArray(o?.rows) ? o.rows : Array.isArray(o?.items) ? o.items : [];
  const rows = (raw as Record<string, unknown>[])
    .filter((r) => r && typeof r === "object")
    .map((r) => ({ date: String(r.date ?? ""), topic: String(r.topic ?? ""), country: String(r.country ?? ""), impressions: Number(r.impressions) || 0 }));
  const sampling = !Array.isArray(o) && typeof o?.sampling === "number" ? o.sampling : 10;
  return { rows, sampling };
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code ? `其他（${code}）` : "不明";
  try {
    regionNames ??= new Intl.DisplayNames(["zh-Hant-TW"], { type: "region" });
    const n = regionNames.of(code);
    return n && n !== code ? n : code;
  } catch {
    return code;
  }
}
