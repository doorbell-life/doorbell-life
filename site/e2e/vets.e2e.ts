// 動物醫院名錄：用我的位置排序只在瀏覽器裡計算、不送出任何請求；各層頁面字級與寬度。
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const BASE = process.env.SITE_URL ?? "http://localhost:4329";
const hasData = existsSync(new URL("../../regions/taiwan/out/dir/vets.json", import.meta.url));

test("用我的位置排序：臺北市中正區附近，最近的是中正區，且不發出任何網路請求", async ({ browser }) => {
  test.skip(!hasData, "沒有同步資料");
  const ctx = await browser.newContext({ geolocation: { latitude: 25.0325, longitude: 121.5199 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  await page.goto(BASE + "/animals/taiwan/vets/");
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.click("#near");
  await expect(page.locator("#near-list li").first()).toContainText("臺北市中正區");
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await ctx.close();
});

test("拒絕定位時給清楚的說明", async ({ browser }) => {
  test.skip(!hasData, "沒有同步資料");
  const ctx = await browser.newContext({ permissions: [] });
  const page = await ctx.newPage();
  await page.goto(BASE + "/animals/taiwan/vets/");
  await page.click("#near");
  await expect(page.locator("#near-msg")).toContainText("請直接選縣市");
  await ctx.close();
});

for (const path of ["/animals/taiwan/vets/", "/animals/taiwan/vets/taoyuan-city/", "/animals/taiwan/vets/taoyuan-city/pingzhen-district/", "/animals/taiwan/vets/hsinchu-city/unlisted-district/"]) {
  for (const width of [360, 1280]) {
    test(`${path} @${width}px：字級不小於 18px、沒有橫向捲動`, async ({ page }) => {
      test.skip(!hasData && path !== "/animals/taiwan/vets/", "沒有同步資料");
      await page.setViewportSize({ width, height: 800 });
      expect((await page.goto(BASE + path))?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const min = await page.evaluate(() => Math.min(...[...document.querySelectorAll("body *")].filter((e) => e.tagName !== "SCRIPT").map((e) => parseFloat(getComputedStyle(e).fontSize))));
      expect(min).toBeGreaterThanOrEqual(18);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}
