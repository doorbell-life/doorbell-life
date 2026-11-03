// 美國地區包的公開資料同步。全量比對：這次來源沒有的個案，輸出就沒有（CLAUDE.md §5）。
// 異常時（格式改變、空資料、數量驟降）不覆寫前一次輸出，以非 0 結束讓 GitHub Actions 通知維護者。
// 失蹤協尋：FBI 協尋海報（見 src/fbi.ts）；異常時暫停顯示失蹤個案（CLAUDE.md §5）。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { invalidReason, isExpired, type Case } from "@doorbell-life/schema";
import { MC_URL, parseMC, toCase } from "./mc.ts";
import { adoptCountCase, statCases } from "./stats.ts";
import { fetchAll, toCase as fbiCase } from "./fbi.ts";

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
  const seen = new Set<string>();
  for (const r of parseMC(raw)) {
    const c = toCase(r);
    if (invalidReason(c) || isExpired(c, today) || seen.has(c.id)) dropped++;
    else {
      seen.add(c.id);
      cases.push(c);
    }
  }
  return { cases, dropped };
}

// 失蹤協尋個案：異常時「暫停顯示」——輸出空檔並以非 0 結束，不沿用前一次資料（CLAUDE.md §5 同步異常）。
const UA = "doorbell.life-sync/1.0 (+https://github.com/doorbell-life/doorbell-life)";

async function syncFBI(today: string) {
  const file = new URL("fbi.json", OUT);
  const prev = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Case[]).length : null;
  mkdirSync(OUT, { recursive: true });
  try {
    // api.fbi.gov 擋 Node 內建 fetch（同樣的 User-Agent 用 curl 可讀，2026-11-03 實測），改用 curl。
    // User-Agent 照實標明是 doorbell.life 的同步程式，不偽裝成瀏覽器。
    const raw = await fetchAll(async (url) =>
      JSON.parse(execFileSync("curl", ["-fsS", "--max-time", "60", "-A", UA, "-H", "accept: application/json", url], { encoding: "utf8" })),
    );
    const cases: Case[] = [];
    let dropped = 0;
    for (const r of raw) {
      const c = fbiCase(r);
      if (invalidReason(c) || isExpired(c, today)) dropped++;
      else cases.push(c);
    }
    if (cases.length === 0) throw new Error("FBI 沒有任何個案");
    const drop = checkDrop(cases.length, prev || null);
    if (drop) throw new Error(drop);
    writeFileSync(file, JSON.stringify(cases));
    console.log(`fbi ok=${cases.length} dropped=${dropped} prev=${prev ?? "none"}`);
  } catch (e) {
    writeFileSync(file, "[]");
    console.error(`fbi 同步異常，暫停顯示失蹤個案：${e instanceof Error ? e.message : e}`);
    process.exitCode = 2;
  }
}

async function main() {
  const file = new URL("mc-adopt.json", OUT);
  const prev = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Case[]).length : null;
  const res = await fetch(MC_URL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Adoptable Pets HTTP ${res.status}`);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/New_York" });
  const { cases, dropped } = build(await res.json(), today);
  const drop = checkDrop(cases.length, prev);
  if (drop) throw new Error(drop);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(file, JSON.stringify(cases));
  console.log(`mc-adopt ok=${cases.length} dropped=${dropped} prev=${prev ?? "none"}`);
  const stats = JSON.parse(readFileSync(new URL("../stats.json", import.meta.url), "utf8"));
  const statOut = [...statCases(stats.items), adoptCountCase(cases.length, today)];
  for (const c of statOut) {
    const bad = invalidReason(c);
    if (bad) throw new Error(`stats ${c.id}：${bad}`);
  }
  writeFileSync(new URL("stats.json", OUT), JSON.stringify(statOut));
  console.log(`stats ok=${statOut.length}`);
  await syncFBI(today);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(`usa 同步異常，保留前一次資料：${e instanceof Error ? e.message : e}`);
    process.exit(2);
  });
}
