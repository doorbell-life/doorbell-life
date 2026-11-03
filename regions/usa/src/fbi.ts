// 美國失蹤協尋：FBI Wanted API 的 missing 類協尋海報（https://api.fbi.gov/wanted/v1/list）。
// fbi.gov 隱私權政策：站上未另行標示出處的資訊屬公共資訊，可散布或複製；但不得使用 FBI 徽章或暗示 FBI 背書（18 U.S.C. §701、§709）。
// 只標示來源，不使用徽章。NCMEC 的 RSS 條款禁止公開顯示，所以不用（維護者 2026-11-03 決定找替代來源）。
// 失蹤人口個案一律 offlineCacheable: false（CLAUDE.md §3 第 4 條）。
import { clean, cleanUrl, type Case } from "@doorbell-life/schema";

export const FBI_URL = "https://api.fbi.gov/wanted/v1/list?poster_classification=missing&pageSize=50";
// 聯絡方式依 fbi.gov/contact-us（2026-11-03 查核）
export const FBI_CONTACT = { name: "FBI tips.fbi.gov", phone: "1-800-CALL-FBI (225-5324)", address: "" };

type Raw = Record<string, unknown>;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// 「October 14, 1996」「October 2013」「1996」→ { y, m, d }，看不懂回傳 null。
export function parseDate(s: string): { y: number; m?: number; d?: number } | null {
  const t = s.trim().toLowerCase();
  let m = t.match(/^([a-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (m && MONTHS.includes(m[1])) return { y: +m[3], m: MONTHS.indexOf(m[1]) + 1, d: +m[2] };
  m = t.match(/^([a-z]+)\s+(\d{4})$/);
  if (m && MONTHS.includes(m[1])) return { y: +m[2], m: MONTHS.indexOf(m[1]) + 1 };
  m = t.match(/^(\d{4})$/);
  return m ? { y: +m[1] } : null;
}

// 失蹤時的年齡；資料不足就回傳 null，不推測。
export function ageWhenMissing(missing: string, dob: string | undefined): number | null {
  const a = parseDate(missing);
  const b = dob ? parseDate(dob) : null;
  if (!a || !b || a.m === undefined || b.m === undefined) return null;
  let age = a.y - b.y;
  if (a.m < b.m || (a.m === b.m && (a.d ?? 1) < (b.d ?? 1))) age--;
  return age;
}

const stripHtml = (v: unknown) => (typeof v === "string" ? v.replace(/<[^>]*>/g, " ") : v);

export function toCase(r: Raw): Case {
  const [when = "", where = ""] = String(r.description ?? "").split(/\r?\n/);
  const dob = Array.isArray(r.dates_of_birth_used) ? String(r.dates_of_birth_used[0]) : undefined;
  const age = ageWhenMissing(when, dob);
  const images = Array.isArray(r.images) ? (r.images as Raw[]) : [];
  // 標題常是「姓名 - 地點」，只留姓名
  const name = clean(String(r.title ?? "").split(" - ")[0], 60);
  return {
    id: `fbi-${clean(r.uid, 40)}`,
    // 失蹤時未滿 18 歲才算兒少；年齡算不出來時歸成人，不推測
    topic: age !== null && age < 18 ? "missing-children" : "missing-adults",
    title: name,
    features: [
      when && `Missing since ${clean(when, 30)}`,
      where && `from ${clean(where, 60)}`,
      age !== null && `age ${age} at the time`,
      clean(r.sex, 10),
      clean(stripHtml(r.remarks), 120),
    ].filter(Boolean).join(", "),
    photo: cleanUrl(images[0]?.large),
    country: "US",
    area: clean(where, 60),
    contentLang: "en",
    contact: FBI_CONTACT,
    source: { id: "fbi", name: "FBI Kidnappings and Missing Persons", url: cleanUrl(r.url) ?? "https://www.fbi.gov/wanted/kidnap", license: "Public information (fbi.gov)" },
    publishedAt: clean(String(r.publication ?? "").slice(0, 10), 10),
    expiresAt: null,
    offlineCacheable: false,
  };
}

export function parsePage(raw: unknown): { total: number; items: Raw[] } {
  const r = raw as Raw;
  if (!r || typeof r !== "object" || !Array.isArray(r.items) || typeof r.total !== "number") throw new Error("FBI 回傳格式不對");
  const first = r.items[0] as Raw | undefined;
  if (first && !["uid", "title", "description", "publication"].every((k) => k in first)) throw new Error("FBI 資料缺少欄位");
  return { total: r.total, items: r.items as Raw[] };
}

// 依序抓完所有頁面。
export async function fetchAll(get: (url: string) => Promise<unknown>): Promise<Raw[]> {
  const all: Raw[] = [];
  for (let page = 1; page <= 20; page++) {
    const { total, items } = parsePage(await get(`${FBI_URL}&page=${page}`));
    all.push(...items);
    if (items.length === 0 || all.length >= total) {
      if (all.length < total) throw new Error(`FBI 只取得 ${all.length}/${total} 筆`);
      return all;
    }
  }
  throw new Error("FBI 頁數超過 20 頁，可能格式改變");
}
