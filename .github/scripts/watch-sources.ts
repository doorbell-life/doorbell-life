// 每週來源比對（CLAUDE.md §9 事實複查）：比對各地區包 sources.json 列的網址，內容指紋與 sources.lock.json 不同就列出並以非 0 結束。
// 維護者查證、更新內容後，執行 `pnpm watch-sources --update` 更新指紋。
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

interface Source { id: string; url: string; note: string; expect?: string[]; manual?: boolean }

const UA = "doorbell.life-sources/1.0 (+https://github.com/doorbell-life/doorbell-life)";
// 用 curl 讀取（有些政府網站擋 Node 內建 fetch），User-Agent 照實標明身分
async function download(url: string): Promise<Buffer> {
  const { stdout } = await promisify(execFile)("curl", ["-fsSL", "--max-time", "60", "-A", UA, url], { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 });
  return stdout;
}

export function missingTexts(html: string, expect: string[]): string[] {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return expect.filter((t) => !text.includes(t));
}

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
  const reminders: string[] = [];
  for (const id of readdirSync(new URL("regions/", ROOT))) {
    const src = new URL(`regions/${id}/sources.json`, ROOT);
    if (!existsSync(src)) continue;
    const lockFile = new URL(`regions/${id}/sources.lock.json`, ROOT);
    const lock: Record<string, string> = existsSync(lockFile) ? JSON.parse(readFileSync(lockFile, "utf8")) : {};
    for (const s of JSON.parse(readFileSync(src, "utf8")).sources as Source[]) {
      // 擋程式讀取的來源：每週列出提醒，由維護者人工複查，不讓工作失敗
      if (s.manual) {
        reminders.push(`${id}/${s.id}（人工複查）：${s.note}\n  ${s.url}`);
        continue;
      }
      let body: Buffer;
      try {
        body = await download(s.url);
      } catch (e) {
        changed.push(`${id}/${s.id} 讀取失敗（${e instanceof Error ? e.message : e}）：${s.note}`);
        continue;
      }
      // 網頁類來源只檢查指定的文字（例如專線號碼）還在不在，避免整頁雜湊因版面小改動誤報
      if (s.expect) {
        const missing = missingTexts(body.toString("utf8"), s.expect);
        if (missing.length) changed.push(`${id}/${s.id} 找不到：${missing.join("、")}（${s.note}）\n  ${s.url}`);
        continue;
      }
      const fp = fingerprint(s.url, body);
      if (lock[s.id] !== fp) {
        if (lock[s.id]) changed.push(`${id}/${s.id} 有變動：${s.note}\n  ${s.url}`);
        lock[s.id] = fp;
      }
    }
    if (update) writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
  }
  if (reminders.length) console.log("以下來源擋程式讀取，請人工複查：\n" + reminders.join("\n"));
  if (changed.length && !update) {
    console.error("以下來源需要人工查證：\n" + changed.join("\n"));
    process.exit(1);
  }
  console.log(update ? "已更新指紋" : "來源沒有變動");
}

if (import.meta.main) main();
