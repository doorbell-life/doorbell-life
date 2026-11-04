// 組出 CDN 要發布的完整資料夾 dist/cdn/：元件、樣式、每日資料、時區對應、錯誤頁範本（放在 /t/ 底下）。
import { cpSync, mkdirSync, rmSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const OUT = new URL("dist/cdn/", ROOT);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(new URL("widget/dist/", ROOT), OUT, { recursive: true });
cpSync(new URL("templates/dist/", ROOT), new URL("t/", OUT), { recursive: true });
// cdn Worker（backend/wrangler.jsonc 的 assets）套用的回應標頭。元件從任何網站跨來源 fetch 每日資料，
// Workers 靜態資源預設不帶 CORS，所以加 Access-Control-Allow-Origin: *；另加 nosniff。
// Cache-Control 不改，沿用預設 public, max-age=0, must-revalidate ＋ ETag。
cpSync(new URL("backend/cdn/_headers", ROOT), new URL("_headers", OUT));
console.log("assembled dist/cdn");
