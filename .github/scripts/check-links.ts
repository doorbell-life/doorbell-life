// 每週來源連結檢查（CLAUDE.md §9 事實複查）：掃所有文章 frontmatter 與比較表引用的網址，抓出已失效的。
// 失效（404、410、5xx、PDF 被轉成網頁）→ 列出並以非 0 結束，GitHub 通知維護者。
// 網站擋程式讀取（401、403、405、406、429）→ 列為「無法自動檢查」，不算失敗，需人工複查。
// 用 curl 讀取，User-Agent 照實標明身分，不偽裝成瀏覽器。
import { execFile } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = new URL("../../", import.meta.url).pathname;
const UA = "doorbell.life-linkcheck/1.0 (+https://github.com/doorbell-life/doorbell-life)";

function walk(dir: string, ext: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}

export function collect(): Map<string, Set<string>> {
  const urls = new Map<string, Set<string>>();
  const add = (u: string, from: string) => {
    if (!u.startsWith("https://") && !u.startsWith("http://")) return;
    if (!urls.has(u)) urls.set(u, new Set());
    urls.get(u)!.add(from.replace(ROOT, ""));
  };
  for (const f of walk(join(ROOT, "site/src/content/articles"), ".md")) {
    const fm = readFileSync(f, "utf8").split(/^---$/m)[1] ?? "";
    for (const m of fm.matchAll(/url:\s*"?([^"\s]+)"?/g)) add(m[1], f);
  }
  for (const f of walk(join(ROOT, "regions"), ".json")) {
    if (!f.includes("/compare/") && !f.endsWith("hotlines.json") && !f.endsWith("stats.json")) continue;
    for (const m of readFileSync(f, "utf8").matchAll(/"(?:url|source)":\s*"(https?:\/\/[^"]+)"/g)) add(m[1], f);
  }
  return urls;
}

export type Verdict = "ok" | "broken" | "blocked";

export function judge(url: string, code: number, type: string): Verdict {
  // 405、406 也是擋程式（例如 NIA 的頁面用瀏覽器讀得到，2026-11-04 實測）
  if ([401, 403, 405, 406, 429].includes(code) || code === 0) return "blocked";
  if (code >= 400) return "broken";
  if (/\.pdf($|\?)/i.test(url) && !/pdf|octet-stream/i.test(type)) return "broken"; // PDF 被轉到錯誤頁
  return "ok";
}

async function check(url: string): Promise<{ code: number; type: string }> {
  try {
    const { stdout } = await run("curl", ["-s", "-L", "-o", "/dev/null", "--max-time", "40", "-A", UA, "-w", "%{http_code} %{content_type}", url]);
    const [code, ...type] = stdout.trim().split(" ");
    return { code: Number(code), type: type.join(" ") };
  } catch {
    return { code: 0, type: "" };
  }
}

async function main() {
  const urls = collect();
  const list = [...urls.keys()];
  const results: { url: string; v: Verdict; code: number }[] = [];
  for (let i = 0; i < list.length; i += 8) {
    const batch = list.slice(i, i + 8);
    const out = await Promise.all(batch.map(async (u) => ({ u, ...(await check(u)) })));
    for (const r of out) results.push({ url: r.u, v: judge(r.u, r.code, r.type), code: r.code });
  }
  const broken = results.filter((r) => r.v === "broken");
  const blocked = results.filter((r) => r.v === "blocked");
  console.log(`檢查 ${results.length} 個網址：正常 ${results.length - broken.length - blocked.length}、失效 ${broken.length}、無法自動檢查 ${blocked.length}`);
  for (const r of blocked) console.log(`無法自動檢查（${r.code}）${r.url}`);
  for (const r of broken) console.error(`失效（${r.code}）${r.url}\n  引用於：${[...urls.get(r.url)!].join("、")}`);
  if (broken.length) process.exit(1);
}

if (import.meta.main) main();
