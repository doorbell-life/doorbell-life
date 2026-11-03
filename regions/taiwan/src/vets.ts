// 動物醫院名錄（CLAUDE.md §9，維護者 2026-11-03 定）：農業部防檢署「獸醫師（佐）開業執照」開放資料，每半年更新。
// 不是個案，不走統一資料格式；輸出到 out/dir/vets.json（子資料夾，元件與範本不會讀到）。
import { readFileSync } from "node:fs";
import { clean } from "@doorbell-life/schema";

export const VETS_URL = "https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078";
export const VETS_SOURCE = { name: "農業部動植物防疫檢疫署 獸醫師（佐）開業執照", url: "https://data.moa.gov.tw/open_detail.aspx?id=078" };
export const NO_DISTRICT = "地址未標示行政區";

export interface Vet {
  county: string;
  district: string; // 從地址解析；地址沒寫就是 NO_DISTRICT，不從路名推測
  name: string;
  vet: string; // 負責獸醫（維護者決定顯示）
  type: string; // 獸醫師／獸醫佐
  phone: string;
  address: string;
  licensedAt: string; // YYYY-MM-DD
}

const REQUIRED = ["縣市", "機構名稱", "負責獸醫", "機構電話", "機構地址", "執照類別", "發照日期"] as const;

// 來源常見「台」與「臺」混用，以及異體字「巿」（U+5DFF）代替「市」。
export const norm = (s: string) => s.replace(/台/g, "臺").replace(/巿/g, "市");

// 官方鄉鎮名單（內政部國土測繪中心界線資料，見 towns.json）。
const TOWNS: Record<string, Record<string, [number, number]>> = JSON.parse(
  readFileSync(new URL("../towns.json", import.meta.url), "utf8"),
).towns;

// 地址裡少數名稱和官方名單寫法不同（異體字），逐一列出，不做一般性的字元替換。
const ALIAS: Record<string, string> = { 溪洲鄉: "溪州鄉" };

// 用官方鄉鎮名單比對地址開頭，不用規則切字（「平鎮區」「新市區」本身就含有鎮、市）。
// 找不到完整名稱時，比對去掉最後一字的名稱主幹（例如員林鎮已升格為員林市、埔里區應為埔里鎮），主幹在該縣市唯一才採用。
export function district(county: string, address: string): string {
  const towns = TOWNS[county];
  const a = norm(address);
  if (!towns || !a.startsWith(county)) return NO_DISTRICT;
  let rest = a.slice(county.length);
  for (const [from, to] of Object.entries(ALIAS)) if (rest.startsWith(from)) rest = to + rest.slice(from.length);
  const exact = Object.keys(towns).filter((t) => rest.startsWith(t)).sort((x, y) => y.length - x.length)[0];
  if (exact) return exact;
  const stem = Object.keys(towns).filter((t) => rest.startsWith(t.slice(0, -1)) && /^[市區鄉鎮]/.test(rest.slice(t.length - 1)));
  return stem.length === 1 ? stem[0] : NO_DISTRICT;
}

export function centroid(county: string, district: string): [number, number] | null {
  return TOWNS[county]?.[district] ?? null;
}

export function parseVets(raw: unknown): Vet[] {
  if (!Array.isArray(raw)) throw new Error("動物醫院資料不是陣列");
  if (raw.length === 0) throw new Error("動物醫院資料是空的");
  const missing = REQUIRED.filter((k) => !(k in (raw[0] as Record<string, unknown>)));
  if (missing.length) throw new Error(`動物醫院資料缺少欄位：${missing.join(", ")}`);
  return (raw as Record<string, unknown>[]).map((r) => {
    const county = norm(clean(r["縣市"], 10));
    const address = norm(clean(r["機構地址"], 100));
    const d = clean(r["發照日期"], 8);
    return {
      county,
      district: district(county, address),
      name: clean(r["機構名稱"], 60),
      vet: clean(r["負責獸醫"], 20),
      type: clean(r["執照類別"], 10),
      phone: clean(r["機構電話"], 30),
      address,
      licensedAt: /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : "",
    };
  }).filter((v) => v.county && v.name);
}
