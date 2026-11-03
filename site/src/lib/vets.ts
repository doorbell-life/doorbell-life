// 動物醫院名錄（CLAUDE.md §9）：建置時讀 regions/taiwan/out/dir/vets.json 與官方鄉鎮名單 towns.json。
// 沒有同步輸出時回傳 null，頁面只說明尚未同步。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTY_SLUG } from "./animals";

export interface Vet { county: string; district: string; name: string; vet: string; type: string; phone: string; address: string; licensedAt: string }
export interface District { name: string; slug: string; center: [number, number] | null; vets: Vet[] }
export interface CountyVets { county: string; slug: string; districts: District[]; total: number }

export const NO_DISTRICT = "地址未標示行政區";
const NO_DISTRICT_SLUG = "unlisted-district";
const file = (p: string) => resolve(process.cwd(), `../regions/taiwan/${p}`);

const towns = JSON.parse(readFileSync(file("towns.json"), "utf8")) as {
  towns: Record<string, Record<string, [number, number]>>;
  eng: Record<string, Record<string, string>>;
  source: { name: string; url: string; checkedAt: string };
};
export const TOWNS_SOURCE = towns.source;

const slugOf = (county: string, district: string) =>
  district === NO_DISTRICT ? NO_DISTRICT_SLUG : (towns.eng[county]?.[district] ?? district).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function vetCounties(): CountyVets[] | null {
  if (!existsSync(file("out/dir/vets.json"))) return null;
  const vets: Vet[] = JSON.parse(readFileSync(file("out/dir/vets.json"), "utf8"));
  return Object.keys(COUNTY_SLUG).flatMap((county) => {
    const mine = vets.filter((v) => v.county === county);
    if (!mine.length) return [];
    const names = [...new Set(mine.map((v) => v.district))];
    // 官方名單順序；未標示行政區放最後
    const order = Object.keys(towns.towns[county] ?? {});
    names.sort((a, b) => (a === NO_DISTRICT ? 1 : b === NO_DISTRICT ? -1 : order.indexOf(a) - order.indexOf(b)));
    return [{
      county,
      slug: COUNTY_SLUG[county],
      total: mine.length,
      districts: names.map((name) => ({
        name,
        slug: slugOf(county, name),
        center: towns.towns[county]?.[name] ?? null,
        vets: mine.filter((v) => v.district === name).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")),
      })),
    }];
  });
}

export const VETS_SOURCE = { name: "農業部動植物防疫檢疫署 獸醫師（佐）開業執照", url: "https://data.moa.gov.tw/open_detail.aspx?id=078" };
export const REPORT_URL = "https://github.com/doorbell-life/doorbell-life/issues/new?template=vet-info.yml";
