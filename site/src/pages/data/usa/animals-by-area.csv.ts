// 數據下載：美國各地區收容所待認養動物數（CSV）。資料來源：Montgomery County, MD Adoptable Pets（Public Domain）。
import type { APIRoute } from "astro";
import { byArea, regionCases, today } from "../../../lib/data";

export const GET: APIRoute = () => {
  const cases = regionCases("usa") ?? [];
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [["area", "adoptable", "dogs", "cats", "other", "date", "source"]];
  for (const r of byArea(cases)) {
    rows.push([r.area, String(r.adopt), String(r.dog), String(r.cat), String(r.adopt - r.dog - r.cat), today("usa"), "Montgomery County, MD – Adoptable Pets https://data.montgomerycountymd.gov/Public-Safety/Adoptable-Pets/e54u-qx42"]);
  }
  return new Response(rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8" } });
};
