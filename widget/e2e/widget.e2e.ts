// 元件在真實瀏覽器裡的行為。CDN 與安裝網站都用 page.route 模擬，不連外網。
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const CDN = "https://cdn.doorbell.life";
const HOST = "https://host.example";
const dist = (f: string) => readFileSync(new URL(`../dist/${f}`, import.meta.url), "utf8");

const T = { "zh-tw": { title: "有人需要幫忙", by: "資料來源：doorbell.life 按門鈴", wait: "請稍候，# 秒後可重試", retry: "現在可以重新整理頁面了" } };
const item = (h: string, extra: Record<string, string> = {}) => ({ k: "animals-adopt", h, d: "臺南市・公、成年", c: "臺南市動物之家 (06)2964439", ...extra });

interface Opts {
  status?: number;
  attrs?: string;
  feed?: unknown;
  feedStatus?: number;
  cssStatus?: number;
}

async function open(page: Page, o: Opts = {}) {
  const status = o.status ?? 404;
  await page.route(`${CDN}/widget.js`, (r) => r.fulfill({ contentType: "text/javascript", body: dist("widget.js") }));
  await page.route(`${CDN}/w.css`, (r) => r.fulfill({ status: o.cssStatus ?? 200, contentType: "text/css", body: dist("w.css") }));
  await page.route(`${CDN}/d/**`, (r) =>
    r.fulfill({ status: o.feedStatus ?? 200, contentType: "application/json", body: JSON.stringify(o.feed ?? { l: "zh-tw", t: T, items: [item("貓・混種貓")] }) }),
  );
  await page.route(`${CDN}/s?**`, (r) => r.fulfill({ status: 204 }));
  await page.route(`${HOST}/**`, (r) =>
    r.fulfill({
      status,
      contentType: "text/html",
      body: `<!doctype html><html lang="zh-TW"><body><h1 id="orig">找不到頁面</h1>
<script src="${CDN}/widget.js" async data-status="${status}" data-region="taiwan" ${o.attrs ?? ""}></script></body></html>`,
    }),
  );
  const res = await page.goto(`${HOST}/missing`);
  return res!;
}

test("404 顯示卡片，狀態碼與網址不變，原本的錯誤頁保留", async ({ page }) => {
  const res = await open(page);
  await expect(page.locator(".dbl-c .dbl-h")).toHaveText("貓・混種貓");
  await expect(page.locator(".dbl-t")).toHaveText("有人需要幫忙");
  // 外框模式 class 與內部元素 class 不能撞名（曾因 dbl-c 撞名讓整張卡片變粗體）
  expect(await page.locator(".dbl-d").evaluate((e) => getComputedStyle(e).fontWeight)).toBe("400");
  expect(res.status()).toBe(404);
  expect(page.url()).toBe(`${HOST}/missing`);
  await expect(page.locator("#orig")).toBeVisible();
});

test("惡意資料只當純文字顯示，不產生任何元素", async ({ page }) => {
  const evil = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';
  await open(page, { feed: { l: "zh-tw", t: T, items: [item(evil, { d: evil, c: evil })] } });
  await expect(page.locator(".dbl-h")).toHaveText(evil);
  expect(await page.locator(".dbl img, .dbl script").count()).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test("不是自家 CDN 的圖片不顯示，自家 CDN 的才顯示", async ({ page }) => {
  await page.route(`${CDN}/img/**`, (r) => r.fulfill({ status: 404 }));
  await open(page, { feed: { l: "zh-tw", t: T, items: [item("a", { img: "https://evil.example/x.png" })] } });
  expect(await page.locator(".dbl img").count()).toBe(0);
  await page.close();
});

test("自家 CDN 圖片會顯示", async ({ page }) => {
  await page.route(`${CDN}/img/**`, (r) => r.fulfill({ status: 404 }));
  await open(page, { feed: { l: "zh-tw", t: T, items: [item("a", { img: `${CDN}/img/x.webp` })] } });
  await expect(page.locator(".dbl img")).toHaveAttribute("src", `${CDN}/img/x.webp`);
});

for (const [name, o] of [
  ["資料讀取失敗", { feedStatus: 500 }],
  ["資料格式錯誤", { feed: { nope: 1 } }],
  ["沒有任何個案", { feed: { l: "zh-tw", t: T, items: [] } }],
  ["樣式讀取失敗", { cssStatus: 500 }],
] as const) {
  test(`${name}時安靜退場：不插入元件，原本的錯誤頁不變`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, o);
    await page.waitForTimeout(500);
    expect(await page.locator(".dbl").count()).toBe(0);
    await expect(page.locator("#orig")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("401、403 縮成一行，不顯示說明與圖片", async ({ page }) => {
  await open(page, { status: 403 });
  await expect(page.locator(".dbl-l .dbl-h")).toHaveText("貓・混種貓");
  expect(await page.locator(".dbl-d").count()).toBe(0);
});

test("503 顯示輪播與倒數", async ({ page }) => {
  await open(page, { status: 503, attrs: 'data-retry="30"', feed: { l: "zh-tw", t: T, items: [item("一"), item("二")] } });
  await expect(page.locator(".dbl-r .dbl-w")).toHaveText(/請稍候，\d+ 秒後可重試/);
});

test("所有文字不小於 18px，即使安裝網站把根字級設得很小", async ({ page }) => {
  await open(page);
  await page.addStyleTag({ content: "html{font-size:10px} body{font-size:8px}" });
  await expect(page.locator(".dbl")).toBeVisible();
  const sizes = await page.locator(".dbl, .dbl *").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(18);
});

test("不設 cookie、不寫入瀏覽器儲存", async ({ page, context }) => {
  await open(page);
  await expect(page.locator(".dbl")).toBeVisible();
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
