// 由各地區包的同步輸出產生元件讀的每日資料檔 dist/d/{地區}.json，以及時區對應用的 dist/_redirects。
// 個案在這裡就依議題時效排好順序，元件不用再排（CLAUDE.md §13）。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { TOPICS, type Case } from "@doorbell-life/schema";

const ROOT = new URL("../../", import.meta.url);
const DIST = new URL("../dist/", import.meta.url);
const CDN = "https://cdn.doorbell.life/";
export const PER_TOPIC = 20; // 每個議題放進每日檔的個案數，控制檔案大小

export interface Item { k: string; h: string; d: string; c: string; img?: string }

export function toItem(c: Case): Item {
  const item: Item = {
    k: c.topic,
    h: c.title,
    d: [c.area, c.features].filter(Boolean).join("・"),
    c: [c.contact.name, c.contact.phone].filter(Boolean).join(" "),
  };
  if (c.photo?.startsWith(CDN)) item.img = c.photo; // 只放已轉存到自家 CDN 的照片
  return item;
}

export function pick(cases: Case[], n: number, rand = Math.random): Case[] {
  const a = [...cases];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function buildFeed(cases: Case[], lang: string, t: Record<string, unknown>) {
  const items = TOPICS.flatMap((k) => pick(cases.filter((c) => c.topic === k), PER_TOPIC).map(toItem));
  return { l: lang.toLowerCase(), t, items };
}

function main() {
  const t: Record<string, unknown> = {};
  for (const f of readdirSync(new URL("i18n/", ROOT)).filter((f) => f.endsWith(".json"))) {
    t[f.slice(0, -5).toLowerCase()] = JSON.parse(readFileSync(new URL(`i18n/${f}`, ROOT), "utf8")).widget; // 只放元件用的文字
  }
  mkdirSync(new URL("d/", DIST), { recursive: true });
  const redirects: string[] = [];
  for (const id of readdirSync(new URL("regions/", ROOT))) {
    const meta = new URL(`regions/${id}/region.json`, ROOT);
    const out = new URL(`regions/${id}/out/`, ROOT);
    if (!existsSync(meta)) continue;
    if (!existsSync(out)) {
      console.warn(`feed: ${id} 沒有同步輸出，略過`);
      continue;
    }
    const region = JSON.parse(readFileSync(meta, "utf8"));
    const cases: Case[] = readdirSync(out)
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => JSON.parse(readFileSync(new URL(f, out), "utf8")));
    const feed = buildFeed(cases, region.lang, t);
    writeFileSync(new URL(`d/${id}.json`, DIST), JSON.stringify(feed));
    for (const tz of region.timezones) redirects.push(`/z/${tz}.json /d/${id}.json 200`);
    console.log(`feed: ${id} items=${feed.items.length}`);
  }
  writeFileSync(new URL("_redirects", DIST), redirects.join("\n") + "\n");
}

if (import.meta.main) main();
