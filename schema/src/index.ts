// 統一資料格式（CLAUDE.md §5）。所有來源（開放資料、合作資料）都轉成 Case。
// 合作單位供稿也照這份格式。

export const TOPICS = [
  "missing-elders",
  "missing-children",
  "missing-adults",
  "blood",
  "animals-lost",
  "animals-adopt",
  "stats",
] as const; // 依時效排序，也是元件的預設播放順序

export type Topic = (typeof TOPICS)[number];

export interface Case {
  id: string; // `{來源代號}-{來源個案編號}`，例如 d01-468469
  topic: Topic;
  title: string;
  features: string;
  photo: string | null; // 來源圖片網址；元件只會用轉存到 cdn.doorbell.life 的版本
  country: string; // ISO 3166-1 alpha-2
  area: string; // 縣市等地區名稱，用於縣市優先
  contentLang: string; // BCP 47，個案內容的原始語言
  contact: { name: string; phone: string; address: string };
  source: { id: string; name: string; url: string; license: string };
  publishedAt: string; // YYYY-MM-DD
  expiresAt: string | null; // YYYY-MM-DD，到期自動下架；null 表示來源未設期限
  offlineCacheable: boolean; // 能否進 5xx 離線版；失蹤人口個案一律 false
}

const MISSING = new Set<Topic>(["missing-elders", "missing-children", "missing-adults"]);

// 來源資料一律不可信（CLAUDE.md §3 第 1 條）。
// 移除控制字元、雙向文字控制字元（可用來偽裝內容）、零寬字元；角括號換成全形；空白收合；限制長度。
// 元件與官網顯示時另外只用純文字，這裡是第二道防線。
export function clean(v: unknown, max = 200): string {
  if (v == null) return "";
  const s = String(v)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/[​-‏‪-‮⁠-⁩﻿]/g, "")
    .replace(/</g, "＜")
    .replace(/>/g, "＞")
    .replace(/\s+/g, " ")
    .trim();
  return [...s].length > max ? [...s].slice(0, max - 1).join("") + "…" : s;
}

// 只接受 https 網址，其他一律當作沒有。
export function cleanUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// 檢查單筆是否符合格式；不符合的回傳原因，同步程式會丟掉該筆並計數。
export function invalidReason(c: Case): string | null {
  if (!c.id) return "id 空白";
  if (!TOPICS.includes(c.topic)) return `未知議題 ${c.topic}`;
  if (!c.title) return "標題空白";
  if (!/^[A-Z]{2}$/.test(c.country)) return `國家代碼錯誤 ${c.country}`;
  if (!DATE.test(c.publishedAt)) return `上架日格式錯誤 ${c.publishedAt}`;
  if (c.expiresAt !== null && !DATE.test(c.expiresAt)) return `到期日格式錯誤 ${c.expiresAt}`;
  if (MISSING.has(c.topic) && c.offlineCacheable) return "失蹤人口個案不得進離線版";
  return null;
}

export function isExpired(c: Case, today: string): boolean {
  return c.expiresAt !== null && c.expiresAt < today;
}
