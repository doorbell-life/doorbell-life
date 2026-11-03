// 動物列表頁（CLAUDE.md §9：列表頁靜態供搜尋收錄，不做個案頁）。依縣市分頁。
import { regionCases, type Case } from "./data";

export const PAGE_SIZE = 60;

// 縣市網址代稱：英文小寫全名，定案後不改（§9 網址規則）。
export const COUNTY_SLUG: Record<string, string> = {
  臺北市: "taipei-city", 新北市: "new-taipei-city", 基隆市: "keelung-city", 宜蘭縣: "yilan-county",
  桃園市: "taoyuan-city", 新竹縣: "hsinchu-county", 新竹市: "hsinchu-city", 苗栗縣: "miaoli-county",
  臺中市: "taichung-city", 彰化縣: "changhua-county", 南投縣: "nantou-county", 雲林縣: "yunlin-county",
  嘉義縣: "chiayi-county", 嘉義市: "chiayi-city", 臺南市: "tainan-city", 高雄市: "kaohsiung-city",
  屏東縣: "pingtung-county", 花蓮縣: "hualien-county", 臺東縣: "taitung-county", 澎湖縣: "penghu-county",
  金門縣: "kinmen-county", 連江縣: "lienchiang-county",
};
const ORDER = Object.keys(COUNTY_SLUG);

export type AnimalTopic = "animals-adopt" | "animals-lost";

export interface County { area: string; slug: string; cases: Case[] }

// 沒有同步輸出時回傳 null，頁面只說明尚未同步，不顯示任何數字。
// 縣市依行政區順序；同縣市內新上架的在前，同日依 id，讓分頁穩定。
export function counties(topic: AnimalTopic): County[] | null {
  const all = regionCases("taiwan");
  if (!all) return null;
  const m = new Map<string, Case[]>();
  for (const c of all) {
    if (c.topic !== topic || !COUNTY_SLUG[c.area]) continue;
    if (!m.has(c.area)) m.set(c.area, []);
    m.get(c.area)!.push(c);
  }
  return ORDER.filter((a) => m.has(a)).map((area) => ({
    area,
    slug: COUNTY_SLUG[area],
    cases: m.get(area)!.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id)),
  }));
}

export const TOPIC: Record<AnimalTopic, { path: string; name: string; other: AnimalTopic }> = {
  "animals-adopt": { path: "/animals/taiwan/adopt/", name: "待認養", other: "animals-lost" },
  "animals-lost": { path: "/animals/taiwan/lost/", name: "剛進收容所", other: "animals-adopt" },
};

// 電話只留數字與 +，給 tel: 連結用。
export const tel = (phone: string) => phone.replace(/[^\d+]/g, "");
