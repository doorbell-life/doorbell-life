// 組出 CDN 要發布的完整資料夾 dist/cdn/：元件、樣式、每日資料、時區對應、錯誤頁範本（放在 /t/ 底下）。
import { cpSync, mkdirSync, rmSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const OUT = new URL("dist/cdn/", ROOT);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(new URL("widget/dist/", ROOT), OUT, { recursive: true });
cpSync(new URL("templates/dist/", ROOT), new URL("t/", OUT), { recursive: true });
console.log("assembled dist/cdn");
