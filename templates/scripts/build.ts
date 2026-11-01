// 產生 templates/dist/：{語言}/4xx 頁、{地區}/429、503、5xx 離線頁。每日流程執行，離線內容跟著每日資料更新。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Case } from "@doorbell-life/schema";
import { FOUR_XX, OFFLINE, render4xx, renderOffline, WAITING } from "../src/render.ts";

const ROOT = new URL("../../", import.meta.url);
const DIST = new URL("../dist/", import.meta.url);
const read = (p: string) => JSON.parse(readFileSync(new URL(p, ROOT), "utf8"));
// 設計 token 唯一的檔案是官網的 tokens.css，範本直接內嵌它，不另寫一份。
const css = readFileSync(new URL("site/src/styles/tokens.css", ROOT), "utf8");
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });

for (const f of readdirSync(new URL("i18n/", ROOT)).filter((f) => f.endsWith(".json"))) {
  const lang = f.slice(0, -5);
  const p = read(`i18n/${f}`).pages;
  mkdirSync(new URL(`${lang}/`, DIST), { recursive: true });
  for (const s of FOUR_XX) writeFileSync(new URL(`${lang}/${s}.html`, DIST), render4xx(s, lang, p, css));
}

for (const id of readdirSync(new URL("regions/", ROOT))) {
  if (!existsSync(new URL(`regions/${id}/region.json`, ROOT))) continue;
  const region = read(`regions/${id}/region.json`);
  const p = read(`i18n/${region.lang}.json`).pages;
  const hotlines = existsSync(new URL(`regions/${id}/hotlines.json`, ROOT)) ? read(`regions/${id}/hotlines.json`).items : [];
  const out = new URL(`regions/${id}/out/`, ROOT);
  const cases: Case[] = existsSync(out)
    ? readdirSync(out).filter((f) => f.endsWith(".json")).flatMap((f) => JSON.parse(readFileSync(new URL(f, out), "utf8")))
    : [];
  mkdirSync(new URL(`${id}/`, DIST), { recursive: true });
  for (const s of [...WAITING, ...OFFLINE]) {
    writeFileSync(new URL(`${id}/${s}.html`, DIST), renderOffline(s, region.lang, id, p, css, hotlines, cases, today));
  }
  console.log(`templates: ${id} cases=${cases.length}`);
}
