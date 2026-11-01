import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseD01, toCase } from "../src/d01.ts";
import { build, checkDrop } from "../src/sync.ts";

// 2026-10-31 從 D01 實際抓下的 6 筆：一般、含角括號備註、含 tab 的尋獲地、無照片、無年齡
const T = "2026-10-31";
const fixture = JSON.parse(readFileSync(new URL("./fixtures/d01.json", import.meta.url), "utf8"));

describe("toCase", () => {
  it("轉成統一格式", () => {
    const c = toCase(fixture[0], T);
    expect(c).toMatchObject({
      id: "d01-468469",
      topic: "animals-adopt",
      title: "貓・混種貓",
      country: "TW",
      area: "臺南市",
      photo: "https://www.pet.gov.tw/upload/pic/1789634683036.png",
      contact: { name: "臺南市動物之家灣裡站", phone: "(06)2964439" },
      publishedAt: "2026-10-22",
      expiresAt: null,
      offlineCacheable: true,
    });
    expect(c.features).toBe("公、成年、中型、灰色、右眼摘除，親人親貓");
  });
  it("輸出中不出現半形角括號與控制字元", () => {
    const out = JSON.stringify(fixture.map((r: Record<string, unknown>) => toCase(r, T)));
    expect(out).not.toMatch(/[<>]/);
    expect(out).not.toMatch(/\\t|\\n|\\u00/);
  });
  it("開放日空白時退回用建立日", () => {
    expect(toCase({ ...fixture[0], animal_opendate: "" }, T).publishedAt).toBe("2026-09-17");
  });
  it("沒有照片時 photo 為 null", () => {
    expect(fixture.map((r: Record<string, unknown>) => toCase(r, T)).some((c: { photo: string | null }) => c.photo === null)).toBe(true);
  });
});

describe("走失毛孩", () => {
  it("開放認養日還沒到的個案歸到 animals-lost，寫出發現地點與開放認養日，前一天下架", () => {
    const c = toCase({ ...fixture[0], animal_opendate: "2026-11-13" }, T);
    expect(c.topic).toBe("animals-lost");
    expect(c.features).toBe("在和緯路四段426號附近被發現。公、成年、中型、灰色、右眼摘除，親人親貓。2026-11-13 開放認養，若是你走失的毛孩請盡快聯絡收容所");
    expect(c.expiresAt).toBe("2026-11-12");
    expect(c.publishedAt).toBe("2026-09-17");
  });
  it("備註以句號結尾時不重複句號", () => {
    const c = toCase({ ...fixture[0], animal_opendate: "2026-11-13", animal_remark: "親人。" }, T);
    expect(c.features).not.toContain("。。");
  });
  it("到了開放認養日就變回待認養", () => {
    expect(toCase({ ...fixture[0], animal_opendate: "2026-10-31" }, T).topic).toBe("animals-adopt");
  });
});

describe("parseD01", () => {
  it("空資料視為異常", () => {
    expect(() => parseD01([])).toThrow("空資料");
  });
  it("缺欄位視為格式異常", () => {
    const { shelter_tel, ...rest } = fixture[0];
    expect(() => parseD01([rest])).toThrow("shelter_tel");
  });
  it("不是陣列視為異常", () => {
    expect(() => parseD01({ error: "x" })).toThrow("不是陣列");
  });
  it("只保留開放認養中的個案", () => {
    expect(parseD01([{ ...fixture[0], animal_status: "CLOSE" }, fixture[1]])).toHaveLength(1);
  });
});

describe("build", () => {
  it("過期個案移除", () => {
    const raw = [{ ...fixture[0], animal_closeddate: "2026-10-01" }, fixture[1]];
    const { cases, dropped } = build(raw, "2026-10-31");
    expect(cases).toHaveLength(1);
    expect(dropped).toBe(1);
  });
});

describe("checkDrop", () => {
  it("數量驟降一半以上視為異常", () => {
    expect(checkDrop(4000, 8679)).toMatch(/驟降/);
    expect(checkDrop(8000, 8679)).toBeNull();
    expect(checkDrop(10, null)).toBeNull();
  });
});
