// 飼養體驗遊戲：真的跨天、一天一次、漏天會記下、7 天後出結果；瀏覽器不能儲存時一次玩完；不發出任何請求。
import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.SITE_URL ?? "http://localhost:4329";
const URL = BASE + "/animals/taiwan/practice/";

async function ready(page: Page) {
  await page.goto(URL);
  if (await page.getByText("遊戲內容準備中").count()) test.skip(true, "遊戲內容尚未加入");
}

async function careToday(page: Page) {
  for (const box of await page.locator("#game .tasks input[type=checkbox]").all()) await box.check();
  await page.locator("#game input[type=radio]").first().check();
  await page.getByRole("button", { name: "完成今天的照顧" }).click();
}

test("跨天：一天一次、漏天記下、第 7 天後看結果，且不發出任何請求", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-03T10:00:00"));
  await ready(page);
  const requests: string[] = [];
  // 只有網站自己的頁面與程式檔可以載入；任何送到別處的請求都不行
  page.on("request", (r) => { if (!r.url().startsWith(BASE + "/")) requests.push(r.url()); });

  await page.locator("#game .choices button").first().click();
  await expect(page.getByRole("heading", { name: /^第 1 天/ })).toBeVisible();
  await careToday(page);
  await expect(page.getByText("今天照顧完了，明天再回來。")).toBeVisible();

  await page.reload();
  await expect(page.getByText(/今天已經照顧過.+了，明天再回來/)).toBeVisible();

  // 跳過第 2 天，第 3 天回來
  await page.clock.setFixedTime(new Date("2026-11-05T10:00:00"));
  await page.reload();
  await expect(page.getByText(/你有 1 天沒來（第 2 天）/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^第 3 天/ })).toBeVisible();
  await careToday(page);

  // 第 7 天過後
  await page.clock.setFixedTime(new Date("2026-11-11T10:00:00"));
  await page.reload();
  await expect(page.getByText(/來照顧的天數：2／7/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "再想一想" })).toBeVisible();

  await page.getByRole("button", { name: "重新開始" }).click();
  await expect(page.getByRole("heading", { name: "選一隻動物" })).toBeVisible();
  expect(requests).toEqual([]);
});

test("瀏覽器不能儲存時，改成一次玩完", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
  });
  await ready(page);
  await expect(page.getByText(/不能儲存進度，所以改成一次玩完/)).toBeVisible();
  await page.locator("#game .choices button").first().click();
  for (let d = 1; d <= 7; d++) {
    await expect(page.getByRole("heading", { name: new RegExp(`^第 ${d} 天`) })).toBeVisible();
    await careToday(page);
    await page.getByRole("button", { name: d < 7 ? "下一天" : "看結果" }).click();
  }
  await expect(page.getByText(/來照顧的天數：7／7/)).toBeVisible();
});

test("壞掉的儲存資料不會讓遊戲出錯", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("doorbell-practice-v1", '{"v":1,"species":"<img src=x onerror=alert(1)>","start":"x"}'));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(page.getByRole("heading", { name: "選一隻動物" })).toBeVisible();
  expect(errors).toEqual([]);
});
