// 動物醫院名錄（CLAUDE.md §9，維護者 2026-11-03 定）：農業部防檢署「獸醫師（佐）開業執照」開放資料，每半年更新。
// 不是個案，不走統一資料格式；輸出到 out/dir/vets.json（子資料夾，元件與範本不會讀到）。
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

export function district(county: string, address: string): string {
  const a = norm(address);
  if (!a.startsWith(county)) return NO_DISTRICT;
  const m = a.slice(county.length).match(/^(.{1,4}?[市區鄉鎮])/);
  return m ? m[1] : NO_DISTRICT;
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
