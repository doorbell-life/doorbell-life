// 台灣地區包的公開資料同步。全量比對：這次來源沒有的個案，輸出就沒有（CLAUDE.md §5）。
// 異常時（格式改變、空資料、數量驟降）不覆寫前一次輸出，以非 0 結束讓 GitHub Actions 通知維護者。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { invalidReason, isExpired, type Case } from "@doorbell-life/schema";
import { D01_URL, parseD01, toCase } from "./d01.ts";
import { adoptCountCase, statCases } from "./stats.ts";

const OUT = new URL("../out/", import.meta.url);
// 與前一次相比，數量少於這個比例就視為異常（例如來源出錯只回傳一部分）。
export const MIN_RATIO = 0.5;

export function checkDrop(next: number, prev: number | null): string | null {
  if (prev && next < prev * MIN_RATIO) return `個案數由 ${prev} 驟降到 ${next}`;
  return null;
}

export function build(raw: unknown, today: string): { cases: Case[]; dropped: number } {
  const cases: Case[] = [];
  let dropped = 0;
  for (const r of parseD01(raw)) {
    const c = toCase(r);
    if (invalidReason(c) || isExpired(c, today)) dropped++;
    else cases.push(c);
  }
  return { cases, dropped };
}

async function main() {
  const file = new URL("animals-adopt.json", OUT);
  const prev = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Case[]).length : null;
  const res = await fetch(D01_URL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`D01 HTTP ${res.status}`);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  const { cases, dropped } = build(await res.json(), today);
  const drop = checkDrop(cases.length, prev);
  if (drop) throw new Error(drop);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(file, JSON.stringify(cases));
  console.log(`d01 ok=${cases.length} dropped=${dropped} prev=${prev ?? "none"}`);
  const stats = JSON.parse(readFileSync(new URL("../stats.json", import.meta.url), "utf8"));
  const statOut = [...statCases(stats.items), adoptCountCase(cases.length, today)];
  for (const c of statOut) {
    const bad = invalidReason(c);
    if (bad) throw new Error(`stats ${c.id}：${bad}`);
  }
  writeFileSync(new URL("stats.json", OUT), JSON.stringify(statOut));
  console.log(`stats ok=${statOut.length}`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(`d01 同步異常，保留前一次資料：${e instanceof Error ? e.message : e}`);
    process.exit(2);
  });
}
