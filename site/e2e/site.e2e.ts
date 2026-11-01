// 官網每一頁：字級不小於 18px、手機寬度沒有橫向捲動、有 h1、導覽可用。
import { expect, test } from "@playwright/test";

const BASE = "http://localhost:4329";
const PAGES = ["/", "/how-it-works/taiwan/", "/install/taiwan/", "/support/taiwan/", "/data/taiwan/"];

for (const path of PAGES) {
  for (const width of [360, 1280]) {
    test(`${path} @${width}px：字級不小於 18px、沒有橫向捲動`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const res = await page.goto(BASE + path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const min = await page.evaluate(() => Math.min(...[...document.querySelectorAll("body *")].map((e) => parseFloat(getComputedStyle(e).fontSize))));
      expect(min).toBeGreaterThanOrEqual(18);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test("導覽連結都連得到", async ({ page }) => {
  await page.goto(BASE + "/");
  for (const href of await page.locator("nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    expect((await page.request.get(BASE + href!)).status()).toBe(200);
  }
});

test("首頁的兩個主要按鈕連得到", async ({ page }) => {
  await page.goto(BASE + "/");
  for (const href of await page.locator(".cta a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    expect((await page.request.get(BASE + href!)).status()).toBe(200);
  }
});
