// 建置時讀各地區包的同步輸出。沒有同步輸出時回傳 null，頁面就不顯示數字，不顯示假資料。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface Case {
  topic: string;
  title: string;
  features: string;
  area: string;
  contact: { name: string; phone: string };
  source: { name: string; url: string };
  publishedAt: string;
}

export function regionCases(region: string): Case[] | null {
  // 建置時 Astro 會把這個模組打包到別處，import.meta.url 不可靠；用建置的工作目錄（site/）定位。
  const file = resolve(process.cwd(), `../regions/${region}/out/d01.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}
