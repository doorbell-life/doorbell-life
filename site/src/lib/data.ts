// 建置時讀各地區包的同步輸出與人工整理檔。沒有同步輸出時回傳 null，頁面就不顯示數字，不顯示假資料。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface Case {
  topic: string;
  title: string;
  features: string;
  area: string;
  contact: { name: string; phone: string };
  source: { name: string; url: string };
  publishedAt: string;
}

// 建置時 Astro 會把這個模組打包到別處，import.meta.url 不可靠；用建置的工作目錄（site/）定位。
const regionFile = (region: string, file: string) => resolve(process.cwd(), `../regions/${region}/${file}`);

export function regionCases(region: string): Case[] | null {
  const file = regionFile(region, "out/d01.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

export interface Stat {
  id: string;
  title: string;
  features: string;
  source: { name: string; url: string };
  publishedAt: string;
  checkedAt: string;
}

export function regionStats(region: string): Stat[] {
  const file = regionFile(region, "stats.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).items : [];
}

export interface AreaRow { area: string; adopt: number; lost: number; dog: number; cat: number }

// 依縣市統計待認養與走失毛孩，縣市依待認養數由多到少。
export function byArea(cases: Case[]): AreaRow[] {
  const m = new Map<string, AreaRow>();
  for (const c of cases) {
    if (!c.topic.startsWith("animals-")) continue;
    const area = c.area || "未標示";
    const r = m.get(area) ?? { area, adopt: 0, lost: 0, dog: 0, cat: 0 };
    if (c.topic === "animals-adopt") r.adopt++;
    else r.lost++;
    if (c.title.startsWith("狗")) r.dog++;
    else if (c.title.startsWith("貓")) r.cat++;
    m.set(area, r);
  }
  return [...m.values()].sort((a, b) => b.adopt - a.adopt);
}

export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
