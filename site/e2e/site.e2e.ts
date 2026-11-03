// 官網每一頁：字級不小於 18px、手機寬度沒有橫向捲動、有 h1、導覽可用。
import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// 本機同時有別的 preview 佔用 4329 時，可用 SITE_URL 指到自己的 preview。
const BASE = process.env.SITE_URL ?? "http://localhost:4329";
const MISSING_SUB = ["", "children/", "elders/", "adults/"];
const MISSING_TW = MISSING_SUB.map((p) => `/missing/taiwan/${p}`);
const MISSING_US = MISSING_SUB.map((p) => `/missing/usa/${p}`);
const MISSING = [...MISSING_TW, ...MISSING_US];
const ABOUT_SUB = ["", "overview/", "data-sources/", "takedown/", "funding/", "sponsors/", "investors/", "help/"];
const ABOUT = ABOUT_SUB.map((p) => `/about/taiwan/${p}`);
const ABOUT_US = ABOUT_SUB.map((p) => `/about/usa/${p}`);
// 兩個地區都有的頁面（hreflang 互相標註）
const SHARED = ["/how-it-works/", "/install/", "/support/", "/data/", "/faq/", "/regions/", "/animals/{r}/adopt/", "/articles/"]
  .map((p) => (p.includes("{r}") ? p : `${p}{r}/`))
  .concat(ABOUT_SUB.map((p) => `/about/{r}/${p}`), MISSING_SUB.map((p) => `/missing/{r}/${p}`));
const PAGES_US = [
  "/how-it-works/usa/", "/install/usa/", "/support/usa/", "/data/usa/",
  ...ABOUT_US, "/faq/usa/", "/regions/usa/", ...MISSING_US,
  "/animals/usa/adopt/", "/articles/usa/",
];
const PAGES = [
  "/", "/how-it-works/taiwan/", "/install/taiwan/", "/support/taiwan/", "/data/taiwan/",
  ...ABOUT, "/faq/taiwan/", "/regions/taiwan/", ...MISSING_TW,
  "/animals/taiwan/adopt/", "/animals/taiwan/lost/", "/articles/taiwan/",
  ...PAGES_US,
  ...["taiwan", "usa"].flatMap((r) => ["", "privacy/", "terms/", "security/", "contact/"].map((p) => `/legal/${r}/${p}`)),
  "/animals/taiwan/practice/",
  ...["taiwan", "usa"].flatMap((r) => ["", "missing/how-to-report-missing/", "blood/who-can-donate-blood/", "animals/shelter-adoption/", "animals/pet-registration/", "animals/found-animal/", "blood/blood-stock/", "missing/dementia-wandering/"].map((p) => `/compare/${r}/${p}`)),
];

test("法律頁草稿：不收錄，且顯示草稿標示", async ({ page }) => {
  for (const path of ["/legal/taiwan/privacy/", "/legal/usa/terms/"]) {
    await page.goto(BASE + path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator(".draft")).toBeVisible();
  }
});

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

test("美國頁面：英文版面，導覽與頁尾連結都連得到", async ({ page }) => {
  await page.goto(BASE + "/how-it-works/usa/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  for (const href of await page.locator("nav a, footer a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
    expect(href).toMatch(/\/usa\/|^\/(about|faq|missing|support|regions|how-it-works)\/taiwan\//);
    expect((await page.request.get(BASE + href!)).status()).toBe(200);
  }
});

test("台灣頁面維持中文版面", async ({ page }) => {
  await page.goto(BASE + "/how-it-works/taiwan/");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
  await expect(page.locator("nav a").first()).toHaveText("運作方式");
});

test("兩個地區都有的頁面互相標註 hreflang", async ({ page }) => {
  for (const p of SHARED) {
    const tw = p.replace("{r}", "taiwan");
    const us = p.replace("{r}", "usa");
    for (const path of [tw, us]) {
      await page.goto(BASE + path);
      const alt = page.locator('link[rel="alternate"][hreflang]');
      await expect(alt, path).toHaveCount(2);
      await expect(page.locator('link[hreflang="zh-Hant-TW"]'), path).toHaveAttribute("href", `https://doorbell.life${tw}`);
      await expect(page.locator('link[hreflang="en-US"]'), path).toHaveAttribute("href", `https://doorbell.life${us}`);
    }
  }
  for (const path of ["/", "/animals/taiwan/lost/"]) {
    await page.goto(BASE + path);
    await expect(page.locator('link[rel="alternate"][hreflang]'), path).toHaveCount(0);
  }
});

test("首頁不自動轉址，只有一個前往美國版的連結", async ({ page }) => {
  const res = await page.goto(BASE + "/");
  expect(res?.url()).toBe(BASE + "/");
  await expect(page.locator('main a[href="/how-it-works/usa/"]')).toHaveCount(1);
  await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
});

// CLAUDE.md §3 第 4 條：任何靜態頁都不列失蹤個案。有 FBI 同步資料時，確認姓名沒有出現在頁面上。
const fbi = new URL("../../regions/usa/out/fbi.json", import.meta.url);
const fbiNames: string[] = existsSync(fbi) ? JSON.parse(readFileSync(fbi, "utf8")).map((c: { title: string }) => c.title.toLowerCase()).filter(Boolean) : [];

test("美國失蹤協尋整區不收錄、不封存，頁面上沒有 FBI 個案姓名", async ({ page }) => {
  for (const path of MISSING_US) {
    await page.goto(BASE + path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, noarchive");
  }
  test.skip(fbiNames.length === 0, "沒有 FBI 同步資料");
  for (const path of [...PAGES, ...MISSING_TW]) {
    await page.goto(BASE + path);
    const text = (await page.evaluate(() => document.title + "\n" + document.body.innerText)).toLowerCase();
    for (const name of fbiNames) expect(text.includes(name), `${path} 出現 ${name}`).toBe(false);
  }
});

test("/animals/usa/adopt/ 地區列表：不放來源照片、字級與寬度", async ({ page }) => {
  await page.goto(`${BASE}/animals/usa/adopt/`);
  const hrefs = await page.locator(".counties a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  test.skip(hrefs.length === 0, "沒有同步資料");
  const first = hrefs[0];
  const second = await page.request.get(`${BASE}${first}2/`);
  for (const path of second.ok() ? [first, `${first}2/`] : [first]) {
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      expect((await page.goto(BASE + path))?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main img")).toHaveCount(0);
      expect(await page.locator(".cases li").count()).toBeGreaterThan(0);
      const min = await page.evaluate(() => Math.min(...[...document.querySelectorAll("body *")].map((e) => parseFloat(getComputedStyle(e).fontSize))));
      expect(min).toBeGreaterThanOrEqual(18);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
