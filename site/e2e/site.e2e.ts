// 官網每一頁：字級不小於 18px、手機寬度沒有橫向捲動、有 h1、導覽可用。
import { expect, test } from "@playwright/test";

// 本機同時有別的 preview 佔用 4329 時，可用 SITE_URL 指到自己的 preview。
const BASE = process.env.SITE_URL ?? "http://localhost:4329";
const MISSING = ["/missing/taiwan/", "/missing/taiwan/children/", "/missing/taiwan/elders/", "/missing/taiwan/adults/"];
const ABOUT = ["", "overview/", "data-sources/", "takedown/", "funding/", "sponsors/", "investors/", "help/"].map((p) => `/about/taiwan/${p}`);
const PAGES = [
  "/", "/how-it-works/taiwan/", "/install/taiwan/", "/support/taiwan/", "/data/taiwan/",
  ...ABOUT, "/faq/taiwan/", "/regions/taiwan/", ...MISSING,
  "/animals/taiwan/adopt/", "/animals/taiwan/lost/", "/articles/taiwan/",
];

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

test("失蹤協尋整區不收錄、不封存", async ({ page }) => {
  for (const path of MISSING) {
    await page.goto(BASE + path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, noarchive");
  }
});

test("頁尾連結都連得到", async ({ page }) => {
  await page.goto(BASE + "/");
  for (const href of await page.locator("footer a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    expect((await page.request.get(BASE + href!)).status()).toBe(200);
  }
});

// 縣市列表頁只在有同步資料時存在（CI 沒有資料），有就檢查第一個縣市的第一頁與第二頁。
for (const kind of ["adopt", "lost"]) {
  test(`/animals/taiwan/${kind}/ 縣市列表：不放來源照片、字級與寬度`, async ({ page }) => {
    await page.goto(`${BASE}/animals/taiwan/${kind}/`);
    const hrefs = await page.locator(".counties a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    test.skip(hrefs.length === 0, "沒有同步資料");
    const first = hrefs[0];
    const second = await page.request.get(`${BASE}${first}2/`);
    for (const path of second.ok() ? [first, `${first}2/`] : [first]) {
      for (const width of [360, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        expect((await page.goto(BASE + path))?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        await expect(page.locator("main img")).toHaveCount(0);
        expect(await page.locator(".cases li").count()).toBeGreaterThan(0);
        const min = await page.evaluate(() => Math.min(...[...document.querySelectorAll("body *")].map((e) => parseFloat(getComputedStyle(e).fontSize))));
        expect(min).toBeGreaterThanOrEqual(18);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  });
}
