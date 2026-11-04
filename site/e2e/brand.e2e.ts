// 品牌主後台：API 全部用 page.route 模擬（契約見 backend/API.md）。
import { expect, test, type Page, type Request } from "@playwright/test";

const BASE = process.env.SITE_URL ?? "http://localhost:4329";
const API = "https://api.doorbell.life";

type Reply = { status?: number; json?: unknown; body?: string } | "abort";
type Handler = (req: Request) => Reply;

// 依「方法 路徑」回應，並記下每個請求。CORS 標頭照真的 API 會給的樣子補上。
async function mockApi(page: Page, handlers: Record<string, Handler>) {
  const calls: { key: string; body: string | null; headers: Record<string, string> }[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const origin = req.headers()["origin"] ?? new URL(BASE).origin;
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const key = `${req.method()} ${new URL(req.url()).pathname}`;
    calls.push({ key, body: req.postData(), headers: req.headers() });
    const h = handlers[key];
    const r: Reply = h ? h(req) : { status: 404, json: { error: "not_found" } };
    if (r === "abort") return route.abort();
    return route.fulfill({
      status: r.status ?? 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: r.body ?? (r.json === undefined ? "" : JSON.stringify(r.json)),
    });
  });
  return calls;
}

const BRAND = {
  id: "b_test1",
  email: "owner@example.com",
  settings: { template: "bell", primary: "oklch(0.5 0.12 30)", font: "system", name: "<img src=x onerror=alert(1)>測試品牌" },
  sites: ["www.example.com"],
};
const me = (): Reply => ({ json: BRAND });

const fontMin = (page: Page) =>
  page.evaluate(() => Math.min(...[...document.querySelectorAll("body *")].map((e) => parseFloat(getComputedStyle(e).fontSize))));
const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("登入：不論信箱存不存在、伺服器回什麼，都顯示同一段話", async ({ page }) => {
  let n = 0;
  const calls = await mockApi(page, {
    "POST /auth/request": () => (n++ === 0 ? { status: 202, json: {} } : n === 2 ? { status: 429, json: { error: "rate_limited" } } : "abort"),
  });
  await page.goto(BASE + "/brand/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const texts: string[] = [];
  for (const email of ["owner@example.com", "nobody@example.com", "third@example.org"]) {
    await page.fill("#email", email);
    await page.click("#login button[type=submit]");
    await expect(page.locator("#msg")).toContainText("登入信已經寄出了");
    texts.push((await page.locator("#msg").textContent())!);
    await page.locator("#msg").evaluate((e) => (e.textContent = ""));
  }
  expect(new Set(texts).size).toBe(1);
  expect(calls.map((c) => JSON.parse(c.body!).email)).toEqual(["owner@example.com", "nobody@example.com", "third@example.org"]);
});

test("登入：信箱格式錯誤時提示，不送出", async ({ page }) => {
  const calls = await mockApi(page, {});
  await page.goto(BASE + "/brand/");
  await page.fill("#email", "not-an-email");
  await page.click("#login button[type=submit]");
  await expect(page.locator("#msg")).toContainText("請輸入完整的信箱");
  expect(calls).toHaveLength(0);
});

test("登入連結：token 有效就轉到後台，網址列不留 token", async ({ page }) => {
  const token = "a".repeat(43);
  const calls = await mockApi(page, { "POST /auth/verify": () => ({ json: { ok: true } }), "GET /brand": me });
  await page.goto(`${BASE}/brand/login/?token=${token}`);
  await page.waitForURL(BASE + "/brand/dashboard/");
  expect(JSON.parse(calls.find((c) => c.key === "POST /auth/verify")!.body!)).toEqual({ token });
  await expect(page.locator("#email")).toHaveText("owner@example.com");
});

test("登入連結：過期或用過時顯示清楚的說明與重寄連結", async ({ page }) => {
  await mockApi(page, { "POST /auth/verify": () => ({ status: 400, json: { error: "expired" } }) });
  await page.goto(`${BASE}/brand/login/?token=${"b".repeat(43)}`);
  await expect(page.locator("#msg")).toContainText("過期或用過了");
  await expect(page.locator('#again a[href="/brand/"]')).toBeVisible();
  expect(page.url()).toBe(BASE + "/brand/login/");
});

test("帳號與網域：資料一律當純文字顯示；網域儲存送出整理過的清單", async ({ page }) => {
  const calls = await mockApi(page, { "GET /brand": me, "PUT /brand/sites": () => ({ json: { ok: true } }) });
  await page.goto(BASE + "/brand/dashboard/");
  await expect(page.locator("#brand-name")).toHaveText(BRAND.settings.name);
  await expect(page.locator("main img")).toHaveCount(0);
  await expect(page.locator("#snippet")).toContainText('data-brand="b_test1"');
  await expect(page.locator("#sites")).toHaveValue("www.example.com");

  await page.fill("#sites", "not a host!");
  await page.click("#sites-form button[type=submit]");
  await expect(page.locator("#sites-msg")).toContainText("不是網域");
  expect(calls.filter((c) => c.key === "PUT /brand/sites")).toHaveLength(0);

  await page.fill("#sites", "https://Shop.Example.com/path\nwww.example.com\nshop.example.com");
  await page.click("#sites-form button[type=submit]");
  await expect(page.locator("#sites-msg")).toContainText("已儲存 2 個網域");
  const put = calls.find((c) => c.key === "PUT /brand/sites")!;
  expect(JSON.parse(put.body!)).toEqual({ sites: ["shop.example.com", "www.example.com"] });
});

test("登出：呼叫 /auth/logout 後回到登入頁", async ({ page }) => {
  const calls = await mockApi(page, { "GET /brand": me, "POST /auth/logout": () => ({ status: 204 }) });
  await page.goto(BASE + "/brand/dashboard/");
  await page.click("#logout");
  await page.waitForURL(BASE + "/brand/");
  expect(calls.map((c) => c.key)).toContain("POST /auth/logout");
});

for (const path of ["/brand/dashboard/", "/brand/design/", "/brand/report/"]) {
  test(`${path}：未登入（401）送回 /brand/`, async ({ page }) => {
    await mockApi(page, {
      "GET /brand": () => ({ status: 401, json: { error: "unauthorized" } }),
      "GET /brand/report": () => ({ status: 401, json: { error: "unauthorized" } }),
    });
    await page.goto(BASE + path);
    await page.waitForURL(BASE + "/brand/");
  });
}

const png = (size: number) => {
  const b = Buffer.alloc(size);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
  return b;
};

test("樣式設計：檔案檢查、儲存送出的內容符合 API 契約", async ({ page }) => {
  const calls = await mockApi(page, {
    "GET /brand": me,
    "POST /brand/assets": () => ({ json: { url: "https://cdn.doorbell.life/a/b_test1/logo.png" } }),
    "PUT /brand/settings": () => ({ json: { ok: true } }),
  });
  await page.route("https://cdn.doorbell.life/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png(8) }));
  await page.goto(BASE + "/brand/design/");
  await expect(page.locator("#name")).toHaveValue(BRAND.settings.name);

  // SVG、過大、偽裝成 PNG 的檔案都在瀏覽器擋下，不上傳
  await page.setInputFiles("#logo", { name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(page.locator("#logo-msg")).toContainText("只能上傳 PNG 或 WebP");
  await page.setInputFiles("#logo", { name: "big.png", mimeType: "image/png", buffer: png(200_001) });
  await expect(page.locator("#logo-msg")).toContainText("超過 200KB");
  await page.setInputFiles("#logo", { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("GIF89a-not-a-png") });
  await expect(page.locator("#logo-msg")).toContainText("不是 PNG 或 WebP");
  expect(calls.filter((c) => c.key === "POST /brand/assets")).toHaveLength(0);

  await page.setInputFiles("#logo", { name: "logo.png", mimeType: "image/png", buffer: png(1024) });
  await expect(page.locator("#logo-msg")).toContainText("已上傳");
  const up = calls.find((c) => c.key === "POST /brand/assets")!;
  expect(up.headers["content-type"]).toBe("image/png");
  await expect(page.locator("#preview-brand img.bp-logo")).toHaveCount(1);

  await page.check('input[name="template"][value="full-image"]');
  await page.locator("#c-l").fill("0.55");
  await page.locator("#c-h").fill("140");
  await page.selectOption("#font", "Noto Serif TC");
  await page.fill("#name", "綠色乖乖");
  await expect(page.locator("#contrast")).toContainText(":1");
  await page.click("#save");
  await expect(page.locator("#save-msg")).toContainText("已儲存");

  const body = JSON.parse(calls.find((c) => c.key === "PUT /brand/settings")!.body!);
  expect(Object.keys(body).sort()).toEqual(["font", "logo", "name", "primary", "template"]);
  expect(body).toMatchObject({ template: "full-image", font: "Noto Serif TC", name: "綠色乖乖", logo: "https://cdn.doorbell.life/a/b_test1/logo.png" });
  const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(body.primary)!;
  expect(m).not.toBeNull();
  expect(+m[1]).toBeGreaterThanOrEqual(0.45);
  expect(+m[1]).toBeLessThanOrEqual(0.55);
  expect(+m[3]).toBe(140);
});

test("樣式設計：亮度滑桿只能在 0.45–0.55", async ({ page }) => {
  await mockApi(page, { "GET /brand": () => ({ json: { ...BRAND, settings: { ...BRAND.settings, primary: "oklch(0.9 0.1 30)" } } }) });
  await page.goto(BASE + "/brand/design/");
  await expect(page.locator("#color-value")).toHaveText("oklch(0.55 0.1 30)");
  await expect(page.locator("#c-l")).toHaveAttribute("min", "0.45");
  await expect(page.locator("#c-l")).toHaveAttribute("max", "0.55");
  // 瀏覽器會把超出範圍的值拉回最小值
  await page.locator("#c-l").evaluate((e: HTMLInputElement) => {
    e.value = "0.2";
    e.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#color-value")).toHaveText(/^oklch\(0\.45 /);
});

test("樣式設計：失蹤協尋預覽是中性樣式，品牌只以小字標示", async ({ page }) => {
  await mockApi(page, { "GET /brand": me });
  await page.goto(BASE + "/brand/design/");
  await page.selectOption("#font", "Noto Serif TC");
  await page.fill("#name", "綠色乖乖");
  const missing = page.locator("#preview-missing aside.dbl");
  const brand = page.locator("#preview-brand aside.dbl");
  await expect(missing).toHaveCount(1);
  const r = await page.evaluate(() => {
    // 對照組：完全沒有品牌設定的元件卡片
    const ref = document.createElement("aside");
    ref.className = "dbl dbl-c";
    const t = document.createElement("p");
    t.className = "dbl-t";
    ref.append(t);
    document.body.append(ref);
    const m = document.querySelector("#preview-missing aside.dbl")!;
    const b = document.querySelector("#preview-brand aside.dbl")!;
    const cs = (e: Element) => getComputedStyle(e);
    const out = {
      refColor: cs(t).color, refFont: cs(ref).fontFamily,
      mColor: cs(m.querySelector(".dbl-t")!).color, mFont: cs(m).fontFamily, mBranded: m.hasAttribute("data-branded"),
      bColor: cs(b.querySelector(".dbl-t")!).color, bFont: cs(b).fontFamily,
      sponsorSize: parseFloat(cs(m.querySelector(".bp-sponsor")!).fontSize),
    };
    ref.remove();
    return out;
  });
  expect(r.mBranded).toBe(false);
  expect(r.mColor).toBe(r.refColor);
  expect(r.mFont).toBe(r.refFont);
  expect(r.bColor).not.toBe(r.refColor);
  expect(r.bFont).toContain("Noto Serif TC");
  expect(r.sponsorSize).toBe(18);
  await expect(missing.locator(".bp-sponsor")).toHaveText("由 綠色乖乖 支持");
  await expect(missing.locator("img")).toHaveCount(0);
});

const ROWS = [
  { date: "2026-11-02", topic: "animals-adopt", country: "TW", impressions: 1230 },
  { date: "2026-11-01", topic: "missing-elders", country: "TW", impressions: 40 },
  { date: "2026-11-01", topic: "<b>x</b>", country: "US", impressions: 10 },
];

test("報表：表格、抽樣說明、CSV 連結與列印", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => void (window as unknown as { printed: number }).printed++;
  });
  const calls = await mockApi(page, { "GET /brand/report": () => ({ json: { rows: ROWS, sampling: 10 } }) });
  await page.goto(BASE + "/brand/report/");
  await expect(page.locator("#table tbody tr")).toHaveCount(3);
  await expect(page.locator("#table tbody tr").first().locator("td")).toHaveText(["2026-11-01", "失智走失長者", "台灣", "40"]);
  await expect(page.locator("#table tbody tr").nth(1).locator("td").nth(1)).toHaveText("<b>x</b>");
  await expect(page.locator("#table tbody tr").nth(2).locator("td").nth(3)).toHaveText("1,230");
  await expect(page.locator("#summary")).toContainText("1,280");
  await expect(page.locator("#sampling")).toContainText("每顯示 10 次記 1 次");

  await page.fill("#from", "2026-10-01");
  await page.fill("#to", "2026-10-31");
  await page.click("#range button[type=submit]");
  await expect.poll(() => calls.filter((c) => c.key === "GET /brand/report").length).toBe(2);
  const last = page.waitForRequest((r) => r.url().includes("/brand/report?"));
  await page.click("#range button[type=submit]");
  expect(new URL((await last).url()).search).toBe("?from=2026-10-01&to=2026-10-31");
  await expect(page.locator("#csv")).toHaveAttribute("href", `${API}/brand/report.csv?from=2026-10-01&to=2026-10-31`);

  await page.click("#pdf");
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("body > header")).toBeHidden();
  await expect(page.locator("#range")).toBeHidden();
  await expect(page.locator("#print-head")).toContainText("2026-10-01 到 2026-10-31");
});

test("報表：開始日期晚於結束日期時提示，不查詢", async ({ page }) => {
  const calls = await mockApi(page, { "GET /brand/report": () => ({ json: { rows: [], sampling: 10 } }) });
  await page.goto(BASE + "/brand/report/");
  await expect(page.locator("#summary")).toContainText("沒有曝光紀錄");
  await page.fill("#from", "2026-11-05");
  await page.fill("#to", "2026-11-01");
  await page.click("#range button[type=submit]");
  await expect(page.locator("#msg")).toContainText("開始日期不能晚於結束日期");
  expect(calls.filter((c) => c.key === "GET /brand/report")).toHaveLength(1);
});

const READY: Record<string, string> = { "/brand/dashboard/": "#body", "/brand/design/": "#preview-missing aside", "/brand/report/": "#table tbody tr >> nth=2" };
for (const [path, ready] of Object.entries(READY)) {
  test(`${path} 有資料時 @360px：字級不小於 18px、沒有橫向捲動`, async ({ page }) => {
    await mockApi(page, { "GET /brand": me, "GET /brand/report": () => ({ json: { rows: ROWS, sampling: 10 } }) });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(BASE + path);
    await expect(page.locator(ready)).toBeVisible();
    expect(await fontMin(page)).toBeGreaterThanOrEqual(18);
    expect(await noHScroll(page)).toBe(true);
  });
}
