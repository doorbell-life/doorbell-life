// 共同題目比較：建置時讀 regions/{地區}/compare/{題目}.json。檔案不存在或欄位是 null，就顯示「尚未查證」。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkCompareFile, COMPARE_TOPICS, type CompareRegionFile, type CompareTopic } from "@doorbell-life/schema/compare";
import { REGIONS, type Region } from "./site";

export { COMPARE_TOPICS, type CompareTopic };
export const ALL_REGIONS = Object.keys(REGIONS) as Region[];

export function regionFile(region: Region, t: CompareTopic): CompareRegionFile {
  const file = resolve(process.cwd(), `../regions/${region}/compare/${t.id}.json`);
  if (!existsSync(file)) return { fields: {} };
  const f: CompareRegionFile = JSON.parse(readFileSync(file, "utf8"));
  const errs = checkCompareFile(t, f);
  if (errs.length) throw new Error(`比較資料不合格（${region}）：\n${errs.join("\n")}`);
  return f;
}

export const L = {
  taiwan: { notYet: "尚未查證", region: { taiwan: "台灣", usa: "美國" }, practice: "可借鏡的做法", sources: "來源", checked: "查核", index: "各地比較", lead: "只列各地的事實，不打分數、不排名。每一格都附官方來源與查核日期；還沒查證的寫「尚未查證」。", item: "項目" },
  usa: { notYet: "Not yet verified", region: { taiwan: "Taiwan", usa: "United States" }, practice: "Practices worth noting", sources: "Sources", checked: "checked", index: "Comparisons", lead: "Facts only, side by side. No scores, no rankings. Every cell cites an official source and the date we checked it; anything we haven't verified says so.", item: "Item" },
} as const;
