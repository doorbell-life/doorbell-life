// doorbell-life 安裝 CLI：偵測架構 → 列出變更 → 確認後才寫入。
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import nginx from "../../configs/nginx/doorbell-life.conf";
import apache from "../../configs/apache/doorbell-life.conf";
import update from "../../configs/update-templates.sh";
import { detect } from "./detect.ts";
import { insertScript, plan, scriptTag, type Action } from "./plan.ts";

const BASE = process.env.DOORBELL_BASE ?? "https://cdn.doorbell.life/t";

const HELP = `doorbell-life：把錯誤頁變成公益資訊曝光位

用法：
  doorbell-life install [資料夾] [--lang zh-TW] [--region taiwan] [--yes]
      偵測架構、列出變更，確認後才寫入。--yes 跳過確認。
  doorbell-life detect [資料夾]       只偵測，不寫入
  doorbell-life snippet [狀態碼]      印出要貼到錯誤頁的一行 script

說明：https://doorbell.life/install/`;

function arg(args: string[], name: string, def: string): string {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

async function fetchTemplate(path: string): Promise<string> {
  if (BASE.startsWith("file://")) return readFileSync(fileURLToPath(`${BASE}/${path}`), "utf8");
  const res = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`下載 ${path} 失敗：HTTP ${res.status}`);
  return res.text();
}

function describe(a: Action): string {
  switch (a.type) {
    case "download": return `下載  ${a.to}（${a.from}）`;
    case "write": return `寫入  ${a.to}`;
    case "insert-script": return `修改  ${a.to}（在 </body> 前加入一行 script）`;
    case "note": return `說明  ${a.text}`;
  }
}

async function apply(a: Action) {
  if (a.type === "note") return;
  mkdirSync(dirname(a.to), { recursive: true });
  if (a.type === "download") writeFileSync(a.to, await fetchTemplate(a.from));
  if (a.type === "write") {
    writeFileSync(a.to, a.content);
    if (a.mode) chmodSync(a.to, a.mode);
  }
  if (a.type === "insert-script") writeFileSync(a.to, insertScript(readFileSync(a.to, "utf8"), a.status));
}

async function main(argv: string[]) {
  const [cmd, ...rest] = argv;
  const positional = rest.filter((x, i) => !x.startsWith("--") && !rest[i - 1]?.startsWith("--"));
  const dir = resolve(positional[0] ?? ".");
  if (cmd === "snippet") {
    console.log(scriptTag(Number(positional[0] ?? 404)));
    return;
  }
  if (cmd !== "install" && cmd !== "detect") {
    console.log(HELP);
    return;
  }
  const root = process.env.DOORBELL_ROOT ?? "/";
  const d = detect(dir, root);
  console.log(`偵測結果：${d.label}`);
  for (const n of d.notes) console.log(`  ${n}`);
  if (cmd === "detect") return;

  const actions = plan(
    d,
    { lang: arg(rest, "--lang", "zh-TW"), region: arg(rest, "--region", "taiwan"), templatesDir: "/var/www/doorbell-life", root },
    { nginx, apache, update },
  );
  console.log("\n將進行以下變更：");
  for (const a of actions) console.log(`  ${describe(a)}`);
  const changes = actions.filter((a) => a.type !== "note");
  if (!changes.length) return;
  if (!rest.includes("--yes")) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ans = (await rl.question("\n要寫入嗎？(y/N) ")).trim().toLowerCase();
    rl.close();
    if (ans !== "y" && ans !== "yes") {
      console.log("已取消，沒有任何變更。");
      return;
    }
  }
  for (const a of changes) await apply(a);
  console.log("完成。");
}

main(process.argv.slice(2)).catch((e) => {
  console.error(`doorbell-life：${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
