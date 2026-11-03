import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invalidReason } from "@doorbell-life/schema";
import { parseMC, toCase } from "../src/mc.ts";
import { build, checkDrop } from "../src/sync.ts";

// 2026-11-03 從 Montgomery County Adoptable Pets 實際抓下的 6 筆：
// 結紮母狗、結紮公狗、天竺鼠（OTHER）、無年齡的烏龜、體型 KITTE 的貓、含發現地點（crossing）的流浪犬
const T = "2026-11-03";
const fixture = JSON.parse(readFileSync(new URL("./fixtures/mc-adopt.json", import.meta.url), "utf8"));

describe("toCase", () => {
  it("轉成統一格式", () => {
    const c = toCase(fixture[0]);
    expect(c).toMatchObject({
      id: "mc-A548528",
      topic: "animals-adopt",
      title: "Asiago · Dog",
      country: "US",
      area: "Montgomery County, MD",
      contentLang: "en",
      photo: "https://www.petharbor.com/get_image.asp?res=DETAIL&id=A548528&location=MONT",
      contact: { name: "Montgomery County Animal Services and Adoption Center", phone: "240-773-5900" },
      publishedAt: "2026-11-01",
      expiresAt: null,
      offlineCacheable: true,
    });
    expect(c.features).toBe("Spayed female, 5 years, medium, Tan / White, Am Pit Bull Ter");
    expect(invalidReason(c)).toBeNull();
  });
  it("結紮公狗", () => {
    expect(toCase(fixture[1]).features).toMatch(/^Neutered male, /);
  });
  it("OTHER 類以品種當種類，不重複寫品種", () => {
    const c = toCase(fixture[2]);
    expect(c.title).toBe("Mocha · Guinea Pig");
    expect(c.features).toBe("Male, 2 years, small, Tricolor");
  });
  it("NO AGE 與無法對應的體型不顯示", () => {
    expect(toCase(fixture[3]).features).not.toMatch(/no age/i);
    expect(toCase(fixture[4]).features).not.toMatch(/kitte/i);
  });
  it("不輸出發現地點", () => {
    expect(JSON.stringify(toCase(fixture[5]))).not.toMatch(/TAMARACK/i);
  });
  it("所有欄位都過濾：角括號換全形、控制字元與雙向控制字元移除", () => {
    const evil = {
      ...fixture[0],
      petname: '<img src=x onerror="alert(1)">‮',
      breed: "MIX\t<script>",
      color: "TAN\nWHITE",
      url: { url: "javascript:alert(1)" },
    };
    const out = JSON.stringify([...fixture.map(toCase), toCase(evil)]);
    expect(out).not.toMatch(/[<>]/);
    expect(out).not.toMatch(/\\t|\\n|\\u00|‮/);
    expect(toCase(evil).photo).toBeNull();
  });
});

describe("parseMC", () => {
  it("空資料視為異常", () => {
    expect(() => parseMC([])).toThrow("空資料");
  });
  it("缺欄位視為格式異常", () => {
    const { breed, ...rest } = fixture[0];
    expect(() => parseMC([rest])).toThrow("breed");
  });
  it("不是陣列視為異常", () => {
    expect(() => parseMC({ error: true, message: "x" })).toThrow("不是陣列");
  });
});

describe("build", () => {
  it("全部轉出，重複 id 只留一筆", () => {
    const { cases, dropped } = build([...fixture, fixture[0]], T);
    expect(cases).toHaveLength(fixture.length);
    expect(dropped).toBe(1);
  });
  it("缺 id 的個案丟掉", () => {
    const { cases, dropped } = build([fixture[0], { ...fixture[1], animalid: "" }], T);
    expect(cases).toHaveLength(1);
    expect(dropped).toBe(1);
  });
});

describe("checkDrop", () => {
  it("數量驟降一半以上視為異常", () => {
    expect(checkDrop(30, 73)).toMatch(/驟降/);
    expect(checkDrop(60, 73)).toBeNull();
    expect(checkDrop(10, null)).toBeNull();
  });
});
