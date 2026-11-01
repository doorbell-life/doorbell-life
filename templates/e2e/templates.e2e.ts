// 範本在真實瀏覽器裡：關掉 JavaScript 也完整顯示，所有文字不小於 18px。
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const DIST = new URL("../dist/", import.meta.url);
const files = readdirSync(DIST, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));

test.use({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });

test("每個範本都有產生", () => {
  expect(files.length).toBeGreaterThanOrEqual(8 * 2 + 6);
});

for (const f of files) {
  test(`${f}：不靠 JavaScript 顯示標題，字級不小於 18px，沒有橫向捲動`, async ({ page }) => {
    await page.goto("file://" + fileURLToPath(new URL(f, DIST)));
    await expect(page.locator("h1")).not.toBeEmpty();
    const min = await page.evaluate(() =>
      Math.min(...[...document.querySelectorAll("body *")].filter((e) => e.tagName !== "SCRIPT").map((e) => parseFloat(getComputedStyle(e).fontSize))),
    );
    expect(min).toBeGreaterThanOrEqual(18);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
