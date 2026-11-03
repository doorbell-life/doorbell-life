// 台灣地區包的公開資料同步。全量比對：這次來源沒有的個案，輸出就沒有（CLAUDE.md §5）。
// 異常時（格式改變、空資料、數量驟降）不覆寫前一次輸出，以非 0 結束讓 GitHub Actions 通知維護者。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { invalidReason, isExpired, type Case } from "@doorbell-life/schema";
import { D01_URL, parseD01, toCase } from "./d01.ts";
import { adoptCountCase, statCases } from "./stats.ts";
import { parseVets, VETS_URL } from "./vets.ts";

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
    const c = toCase(r, today);
    if (invalidReason(c) || isExpired(c, today)) dropped++;
    else cases.push(c);
  }
  return { cases, dropped };
}

// 動物醫院名錄：異常時保留前一次輸出，不影響個案同步。
async function syncVets() {
  const dir = new URL("dir/", OUT);
  const file = new URL("vets.json", dir);
  const prev = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as unknown[]).length : null;
  try {
    const res = await fetch(VETS_URL, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const vets = parseVets(await res.json());
    const drop = checkDrop(vets.length, prev);
    if (drop) throw new Error(drop);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(vets));
    console.log(`vets ok=${vets.length} prev=${prev ?? "none"}`);
  } catch (e) {
    console.error(`vets 同步異常，保留前一次資料：${e instanceof Error ? e.message : e}`);
    process.exitCode = 2;
  }
}

async function main() {
  const file = new URL("d01.json", OUT);
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
  const statOut = [...statCases(stats.items), adoptCountCase(cases.filter((c) => c.topic === "animals-adopt").length, today)];
  for (const c of statOut) {
    const bad = invalidReason(c);
    if (bad) throw new Error(`stats ${c.id}：${bad}`);
  }
  writeFileSync(new URL("stats.json", OUT), JSON.stringify(statOut));
  console.log(`stats ok=${statOut.length}`);
  await syncVets();
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(`d01 同步異常，保留前一次資料：${e instanceof Error ? e.message : e}`);
    process.exit(2);
  });
}
