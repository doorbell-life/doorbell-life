import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invalidReason } from "@doorbell-life/schema";
import { ageWhenMissing, fetchAll, parseDate, parsePage, toCase } from "../src/fbi.ts";

// 2026-11-03 從 FBI Wanted API 抓的 3 筆：成人、沒有生日、失蹤時未成年
const fixture = JSON.parse(readFileSync(new URL("./fixtures/fbi-missing.json", import.meta.url), "utf8"));
const [adult, noDob, child] = fixture.items;

describe("年齡與分類", () => {
  it("解析日期", () => {
    expect(parseDate("October 14, 1996")).toEqual({ y: 1996, m: 10, d: 14 });
    expect(parseDate("October 2013")).toEqual({ y: 2013, m: 10 });
    expect(parseDate("someday")).toBeNull();
  });
  it("失蹤時年齡，生日還沒到要減一歲", () => {
    expect(ageWhenMissing("August 30, 1979", "February 10, 1967")).toBe(12);
    expect(ageWhenMissing("January 1, 2000", "December 31, 1990")).toBe(9);
    expect(ageWhenMissing("1990", "May 1, 1980")).toBeNull();
  });
  it("未滿 18 歲歸兒少，算不出來歸成人", () => {
    expect(toCase(child).topic).toBe("missing-children");
    expect(toCase(adult).topic).toBe("missing-adults");
    expect(toCase(noDob).topic).toBe("missing-adults");
  });
});

describe("toCase", () => {
  it("失蹤個案不可離線快取，符合統一格式，聯絡方式是 FBI 官方管道", () => {
    for (const r of fixture.items) {
      const c = toCase(r);
      expect(c.offlineCacheable).toBe(false);
      expect(invalidReason(c)).toBeNull();
      expect(c.contact.phone).toBe("1-800-CALL-FBI (225-5324)");
      expect(c.source.url).toMatch(/^https:\/\/www\.fbi\.gov\//);
    }
  });
  it("標題只留姓名，備註去掉 HTML 標籤", () => {
    const c = toCase(noDob);
    expect(c.title).toBe("JAMES S. RULAND");
    expect(c.features).not.toMatch(/[<>＜＞]/);
    expect(c.features).toMatch(/^Missing since October 26, 1995, from North Fond du Lac, Wisconsin/);
  });
});

describe("分頁與異常", () => {
  it("格式不對、缺欄位視為異常", () => {
    expect(() => parsePage({ nope: 1 })).toThrow("格式");
    expect(() => parsePage({ total: 1, items: [{ title: "x" }] })).toThrow("缺少欄位");
  });
  it("抓完所有頁；筆數不足視為異常", async () => {
    const pages = [{ total: 3, items: [adult, noDob] }, { total: 3, items: [child] }];
    let i = 0;
    expect(await fetchAll(async () => pages[i++])).toHaveLength(3);
    await expect(fetchAll(async () => ({ total: 5, items: [] }))).rejects.toThrow("0/5");
  });
});
