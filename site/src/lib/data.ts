// 建置時讀各地區包的同步輸出與人工整理檔。沒有同步輸出時回傳 null，頁面就不顯示數字，不顯示假資料。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

export interface Case {
  id: string;
  topic: string;
  title: string;
  features: string;
  area: string;
  contact: { name: string; phone: string; address: string };
  source: { name: string; url: string };
  publishedAt: string;
}

// 建置時 Astro 會把這個模組打包到別處，import.meta.url 不可靠；用建置的工作目錄（site/）定位。
const regionFile = (region: string, file: string) => resolve(process.cwd(), `../regions/${region}/${file}`);

// 官網列表頁用的動物個案檔。只讀這些檔：失蹤個案（例如 usa 的 out/fbi.json）絕不進靜態頁（CLAUDE.md §3 第 4 條）。
const ANIMAL_FILES: Record<string, string> = { taiwan: "out/d01.json", usa: "out/mc-adopt.json" };

export function regionCases(region: string): Case[] | null {
  const file = ANIMAL_FILES[region] ? regionFile(region, ANIMAL_FILES[region]) : null;
  return file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
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

export interface Hotline { name: string; number: string; hours: string; source: string; checkedAt: string }

export function regionHotlines(region: string): Hotline[] {
  const file = regionFile(region, "hotlines.json");
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
    // 台灣的標題以「狗」「貓」開頭；美國是「名字 · Dog」
    if (c.title.startsWith("狗") || /(^| · )Dog$/.test(c.title)) r.dog++;
    else if (c.title.startsWith("貓") || /(^| · )Cat$/.test(c.title)) r.cat++;
    m.set(area, r);
  }
  return [...m.values()].sort((a, b) => b.adopt - a.adopt);
}

const TZ: Record<string, string> = { taiwan: "Asia/Taipei", usa: "America/New_York" };
export const today = (region = "taiwan") => new Date().toLocaleDateString("sv-SE", { timeZone: TZ[region] ?? "UTC" });

// 已建置的靜態頁網址（不含動態路由），給 hreflang 判斷另一個地區有沒有同一頁。
let routes: Set<string> | null = null;
export function staticRoutes(): Set<string> {
  if (routes) return routes;
  const dir = resolve(process.cwd(), "src/pages");
  routes = new Set(
    (readdirSync(dir, { recursive: true }) as string[])
      .filter((f) => f.endsWith(".astro") && !f.includes("["))
      .map((f) => "/" + f.split(sep).join("/").replace(/index\.astro$/, "").replace(/\.astro$/, "/")),
  );
  return routes;
}
