// 品牌樣式與三種版型（CLAUDE.md §6、§13）。CDN、品牌設定檔、安裝網站都用 page.route 模擬，不連外網。
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

const CDN = "https://cdn.doorbell.life";
const HOST = "https://host.example";
const dist = (f: string) => readFileSync(new URL(`../dist/${f}`, import.meta.url));

const T = { "zh-tw": { title: "有人需要幫忙", by: "資料來源：doorbell.life 按門鈴", wait: "請稍候，# 秒後可重試", retry: "現在可以重新整理頁面了", sup: "由 # 支持" } };
const animal = (h: string, extra: Record<string, string> = {}) => ({ k: "animals-adopt", h, d: "臺南市・公、成年", c: "臺南市動物之家 (06)2964439", ...extra });
const missing = (h: string) => ({ k: "missing-children", h, d: "臺北市・身高 120 公分", c: "兒福聯盟協尋專線 (02)2799-2600" });
const IMG = `${CDN}/img/a.webp`;
const LOGO = `${CDN}/b/logo.webp`;
const GREEN_O = "oklch(0.6 0.15 145)";
const brand = (extra: Record<string, unknown> = {}) => ({ t: "bell", v: { brand: "#3a9a4a", "brand-o": GREEN_O }, n: "綠色乖乖", logo: LOGO, ...extra });
// 測試用小圖：寬 4、高 3 的 SVG，Content-Type 決定格式，網址副檔名不影響
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#8a7"/></svg>';

interface Opts {
  status?: number;
  attrs?: string;
  items?: unknown[];
  brand?: unknown;
  brandStatus?: number;
  brandBody?: string;
}

async function open(page: Page, o: Opts = {}) {
  const status = o.status ?? 404;
  await page.route(`${CDN}/widget.js`, (r) => r.fulfill({ contentType: "text/javascript", body: dist("widget.js") }));
  await page.route(`${CDN}/w.css`, (r) => r.fulfill({ contentType: "text/css", body: dist("w.css") }));
  await page.route(`${CDN}/d/**`, (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify({ l: "zh-tw", t: T, items: o.items ?? [animal("貓・混種貓", { img: IMG })] }) }),
  );
  await page.route(`${CDN}/b/*.json`, (r) =>
    r.fulfill({ status: o.brandStatus ?? 200, contentType: "application/json", body: o.brandBody ?? JSON.stringify(o.brand ?? brand()) }),
  );
  await page.route(`${CDN}/img/**`, (r) => r.fulfill({ contentType: "image/svg+xml", body: SVG }));
  await page.route(LOGO, (r) => r.fulfill({ contentType: "image/svg+xml", body: SVG }));
  await page.route(`${CDN}/s?**`, (r) => r.fulfill({ status: 204 }));
  await page.route(`${HOST}/**`, (r) =>
    r.fulfill({
      status,
      contentType: "text/html",
      body: `<!doctype html><html lang="zh-TW"><body><h1 id="orig">找不到頁面</h1>
<script src="${CDN}/widget.js" async data-status="${status}" data-region="taiwan" data-brand="g1" ${o.attrs ?? ""}></script></body></html>`,
    }),
  );
  await page.goto(`${HOST}/missing`);
  await expect(page.locator(".dbl")).toBeVisible();
}

/** 把一個 CSS 顏色換成瀏覽器的計算值，方便和元件的計算值比對 */
const computed = (page: Page, color: string) =>
  page.evaluate((c) => {
    const e = document.createElement("i");
    e.style.color = c;
    document.body.append(e);
    const v = getComputedStyle(e).color;
    e.remove();
    return v;
  }, color);
const titleColor = (page: Page) => page.locator(".dbl-t").evaluate((e) => getComputedStyle(e).color);
const dotColor = (page: Page) => page.locator(".dbl-t").evaluate((e) => getComputedStyle(e, "::before").backgroundColor);
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const minFont = (page: Page) =>
  page.locator(".dbl, .dbl *").evaluateAll((els) =>
    Math.min(...els.filter((e) => getComputedStyle(e).display != "none").map((e) => parseFloat(getComputedStyle(e).fontSize))),
  );

test("門鈴燈（bell）：動物個案套品牌色，角落顯示 Logo 與「由 {品牌} 支持」", async ({ page }) => {
  await open(page);
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-c dbl-bell");
  const green = await computed(page, GREEN_O);
  expect(await titleColor(page)).toBe(green);
  expect(await dotColor(page)).toBe(green);
  await expect(page.locator(".dbl-o")).toHaveText("由 綠色乖乖 支持");
  await expect(page.locator(".dbl-o .dbl-g")).toHaveAttribute("src", LOGO);
  // 版面結構不變：照片在左欄
  expect(await page.locator(".dbl-b").evaluate((e) => getComputedStyle(e).display)).toBe("grid");
});

test("瀏覽器不支援 oklch 時，品牌色用 hex 備援", async ({ page }) => {
  await open(page);
  // 模擬舊瀏覽器：把 w.css 裡 @supports not (oklch) 區塊的規則無條件套用
  const css = dist("w.css").toString();
  const start = css.indexOf("{", css.indexOf("@supports not")) + 1;
  let depth = 1, end = start;
  while (depth) depth += css[end] == "{" ? 1 : css[end] == "}" ? -1 : 0, end++;
  await page.addStyleTag({ content: css.slice(start, end - 1) });
  expect(await titleColor(page)).toBe(await computed(page, "#3a9a4a"));
});

test("滿版圖（full-image）：照片撐滿卡片寬度放最上面，文字在下", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await open(page, { brand: brand({ t: "full-image" }) });
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-c dbl-full-image");
  const img = (await page.locator(".dbl-i").boundingBox())!;
  const root = (await page.locator(".dbl").boundingBox())!;
  const h = (await page.locator(".dbl-h").boundingBox())!;
  const title = (await page.locator(".dbl-t").boundingBox())!;
  expect(Math.abs(img.width - (root.width - 2))).toBeLessThanOrEqual(1); // 只扣左右 1px 邊框
  expect(img.y).toBeLessThan(title.y);
  expect(img.y + img.height).toBeLessThanOrEqual(h.y);
  expect(await noHScroll(page)).toBe(true);
});

test("滿版圖：個案沒有自家 CDN 照片時退回門鈴燈版面", async ({ page }) => {
  await open(page, { brand: brand({ t: "full-image" }), items: [animal("狗・米克斯", { img: "https://evil.example/x.png" })] });
  expect(await page.locator(".dbl img.dbl-i").count()).toBe(0);
  expect(await page.locator(".dbl").evaluate((e) => getComputedStyle(e).display)).toBe("block");
  expect(await page.locator(".dbl-b").evaluate((e) => getComputedStyle(e).display)).toBe("block");
  await expect(page.locator(".dbl-t")).toBeVisible();
});

for (const status of [404, 503]) {
  test(`簡潔一行（one-line）：${status} 也縮成一行，不顯示標題、說明、照片`, async ({ page }) => {
    await open(page, { status, brand: brand({ t: "one-line" }) });
    await expect(page.locator(".dbl")).toHaveClass(`dbl dbl-${status == 503 ? "r" : "c"} dbl-one-line`);
    await expect(page.locator(".dbl-h")).toHaveText("貓・混種貓");
    for (const c of [".dbl-t", ".dbl-d", ".dbl-i"]) await expect(page.locator(c)).toBeHidden();
    const h = (await page.locator(".dbl-h").boundingBox())!;
    const n = (await page.locator(".dbl-n").boundingBox())!;
    expect(Math.abs(h.y - n.y)).toBeLessThan(12); // 同一行
    expect(await page.locator(".dbl-h").evaluate((e) => getComputedStyle(e, "::before").backgroundColor)).toBe(await computed(page, GREEN_O));
  });
}

test("失蹤協尋個案一律中性樣式：不套品牌色、不換版型、不放 Logo，只留角落小字", async ({ page }) => {
  await open(page, { brand: brand({ t: "one-line" }), items: [missing("王小明")] });
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-c");
  await expect(page.locator(".dbl-t")).toBeVisible(); // 沒被 one-line 縮掉
  await expect(page.locator(".dbl-d")).toBeVisible();
  expect(await titleColor(page)).toBe(await computed(page, "oklch(.52 .16 55)"));
  expect(await page.locator(".dbl").evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe("1px");
  await expect(page.locator(".dbl-o")).toHaveText("由 綠色乖乖 支持");
  expect(await page.locator(".dbl-o").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBe(18);
  expect(await page.locator(".dbl-g").count()).toBe(0);
});

test("輪播混合議題時逐個判斷：失蹤個案中性，換到動物個案才套品牌", async ({ page }) => {
  await page.clock.install();
  await open(page, { status: 503, brand: brand({ t: "full-image" }), items: [missing("王小明"), animal("貓・混種貓", { img: IMG })] });
  await expect(page.locator(".dbl-h")).toHaveText("王小明");
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-r");
  expect(await page.locator(".dbl-g").count()).toBe(0);
  await page.clock.runFor(8000);
  await expect(page.locator(".dbl-h")).toHaveText("貓・混種貓");
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-r dbl-full-image");
  await expect(page.locator(".dbl-g")).toHaveCount(1);
  await page.clock.runFor(8000);
  await expect(page.locator(".dbl-h")).toHaveText("王小明");
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-r");
  await expect(page.locator(".dbl-g")).toHaveCount(0);
});

test("不認得的版型用預設；非自家 CDN 的 Logo 不顯示；惡意品牌名稱只當純文字", async ({ page }) => {
  const evil = `<img src=x onerror="window.__pwned=1">$'$&<b>`;
  const external: string[] = [];
  await page.route("https://evil.example/**", (r) => {
    external.push(r.request().url());
    return r.fulfill({ status: 404 });
  });
  await open(page, {
    brand: {
      t: "one-line full-image",
      n: evil,
      logo: "https://evil.example/logo.png",
      // 品牌變數不能蓋掉中性樣式，也不能用 url() 載入外部資源
      v: { brand: "url(https://evil.example/a.png)", "brand-o": "url(https://evil.example/b.png)", bg: "url(https://evil.example/c.png)", "dbl-bg": "red" },
    },
  });
  await expect(page.locator(".dbl")).toHaveClass("dbl dbl-c dbl-bell");
  await expect(page.locator(".dbl-o")).toHaveText(`由 ${evil} 支持`);
  expect(await page.locator(".dbl-g, .dbl-o *").count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  expect(await page.locator(".dbl").evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(await computed(page, "oklch(.97 .005 250)"));
  await page.waitForTimeout(300);
  expect(external).toEqual([]);
});

for (const [name, o] of [
  ["品牌設定讀取失敗", { brandStatus: 500 }],
  ["品牌設定不是 JSON", { brandBody: "<html>oops" }],
] as const) {
  test(`${name}時用預設樣式照常顯示個案`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, o);
    await expect(page.locator(".dbl")).toHaveClass("dbl dbl-c");
    await expect(page.locator(".dbl-h")).toHaveText("貓・混種貓");
    expect(await titleColor(page)).toBe(await computed(page, "oklch(.52 .16 55)"));
    expect(await page.locator(".dbl-o").count()).toBe(0);
    expect(errors).toEqual([]);
  });
}

for (const t of ["bell", "full-image", "one-line"]) {
  test(`${t}：窄螢幕不出現水平捲軸，所有文字不小於 18px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page, { brand: brand({ t, n: "很長很長的品牌名稱".repeat(4) + "VeryLongBrandNameWithoutAnySpaces".repeat(2) }) });
    await page.addStyleTag({ content: "html{font-size:10px} body{font-size:8px}" });
    expect(await noHScroll(page)).toBe(true);
    expect(await minFont(page)).toBeGreaterThanOrEqual(18);
  });
}

test("widget.js gzip 後不超過 1,024 bytes", () => {
  expect(gzipSync(dist("widget.js"), { level: 9 }).length).toBeLessThanOrEqual(1024);
});
