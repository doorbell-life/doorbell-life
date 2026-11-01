// 數據下載：各縣市公立收容所動物數（CSV）。資料來源：農業部 動物認領養開放資料。
import type { APIRoute } from "astro";
import { byArea, regionCases, today } from "../../../lib/data";

export const GET: APIRoute = () => {
  const cases = regionCases("taiwan") ?? [];
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [["縣市", "待認養", "可能有飼主在找", "狗", "貓", "資料日期", "來源"]];
  for (const r of byArea(cases)) rows.push([r.area, String(r.adopt), String(r.lost), String(r.dog), String(r.cat), today(), "農業部 動物認領養 https://data.gov.tw/dataset/85903"]);
  return new Response("﻿" + rows.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8" } });
};
