// 每週來源比對（CLAUDE.md §9 事實複查）：比對各地區包 sources.json 列的網址，內容指紋與 sources.lock.json 不同就列出並以非 0 結束。
// 維護者查證、更新內容後，執行 `pnpm watch-sources --update` 更新指紋。
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const update = process.argv.includes("--update");

// data.gov.tw 的詮釋資料含檢查時間等每次都會變的欄位，只取標題、異動時間與下載網址。
export function fingerprint(url: string, body: Buffer): string {
  let data: string | Buffer = body;
  if (url.startsWith("https://data.gov.tw/api/v2/rest/dataset/")) {
    const r = JSON.parse(body.toString("utf8")).result;
    data = JSON.stringify([r.title, r.modifiedDate, r.distribution.map((d: { resourceDownloadUrl: string }) => d.resourceDownloadUrl)]);
  }
  return createHash("sha256").update(data).digest("hex");
}

async function main() {
  const changed: string[] = [];
  for (const id of readdirSync(new URL("regions/", ROOT))) {
    const src = new URL(`regions/${id}/sources.json`, ROOT);
    if (!existsSync(src)) continue;
    const lockFile = new URL(`regions/${id}/sources.lock.json`, ROOT);
    const lock: Record<string, string> = existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, "utf8")) : {};
    for (const s of JSON.parse(readFileSync(src, "utf8")).sources as { id: string; url: string; note: string }[]) {
      let fp: string;
      try {
        const res = await fetch(s.url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fp = fingerprint(s.url, Buffer.from(await res.arrayBuffer()));
      } catch (e) {
        changed.push(`${id}/${s.id} 讀取失敗（${e instanceof Error ? e.message : e}）：${s.note}`);
        continue;
      }
      if (lock[s.id] !== fp) {
        if (lock[s.id]) changed.push(`${id}/${s.id} 有變動：${s.note}\n  ${s.url}`);
        lock[s.id] = fp;
      }
    }
    if (update) writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
  }
  if (changed.length && !update) {
    console.error("以下來源需要人工查證：\n" + changed.join("\n"));
    process.exit(1);
  }
  console.log(update ? "已更新指紋" : "來源沒有變動");
}

if (import.meta.main) main();
