import { describe, expect, it } from "vitest";
import {
  CARD_BG, contrast, formatOklch, inRange, normalizeHost, parseOklch, parseSites, readReport, sortRows, toHex, WHITE,
} from "../src/lib/brand";

describe("網域", () => {
  it("接受網域或完整網址，轉成小寫主機名稱", () => {
    expect(normalizeHost("WWW.Example.com")).toBe("www.example.com");
    expect(normalizeHost("https://shop.example.com.tw:8443/a?b=1")).toBe("shop.example.com.tw");
  });
  it("拒絕不合法的主機名稱", () => {
    for (const s of ["localhost", "-a.com", "a..com", "例子.tw", "a_b.com", "<script>.com", "a".repeat(64) + ".com"]) {
      expect(normalizeHost(s), s).toBeNull();
    }
  });
  it("一次貼多行：去重，列出錯的", () => {
    expect(parseSites("a.com\nA.com, b.org\n\nbad")).toEqual({ sites: ["a.com", "b.org"], bad: ["bad"] });
  });
});

describe("主色", () => {
  it("解析與輸出 oklch 字串", () => {
    expect(parseOklch("oklch(0.5 0.12 250)")).toEqual({ l: 0.5, c: 0.12, h: 250 });
    expect(parseOklch("oklch(50% 0.1 30deg)")).toEqual({ l: 0.5, c: 0.1, h: 30 });
    expect(parseOklch("rgb(0,0,0)")).toBeNull();
    expect(formatOklch({ l: 0.5004, c: 0.12, h: 250.04 })).toBe("oklch(0.5 0.12 250)");
  });
  it("亮度只能在 0.45–0.55", () => {
    expect(inRange({ l: 0.45, c: 0.1, h: 0 })).toBe(true);
    expect(inRange({ l: 0.56, c: 0.1, h: 0 })).toBe(false);
    expect(inRange({ l: 0.44, c: 0.1, h: 0 })).toBe(false);
  });
  it("hex 備援與對比：黑白、中灰", () => {
    expect(toHex({ l: 1, c: 0, h: 0 })).toBe("#ffffff");
    expect(toHex({ l: 0, c: 0, h: 0 })).toBe("#000000");
    expect(contrast(WHITE, { l: 0, c: 0, h: 0 })).toBeCloseTo(21, 0);
    // 範圍內最暗的顏色放在卡片底色上，對比至少有大字標準 3:1
    expect(contrast({ l: 0.55, c: 0, h: 0 }, CARD_BG)).toBeGreaterThan(3);
    expect(contrast({ l: 0.45, c: 0, h: 0 }, CARD_BG)).toBeGreaterThan(4.5);
  });
});

describe("報表", () => {
  it("接受 { rows, sampling } 或陣列", () => {
    const row = { date: "2026-11-01", topic: "blood", country: "TW", impressions: 30 };
    expect(readReport({ rows: [row], sampling: 10 })).toEqual({ rows: [row], sampling: 10 });
    expect(readReport([row])).toEqual({ rows: [row], sampling: 10 });
    expect(readReport(null)).toEqual({ rows: [], sampling: 10 });
  });
  it("依日期、議題時效、國家排序", () => {
    const r = (date: string, topic: string, country: string) => ({ date, topic, country, impressions: 10 });
    const out = sortRows([r("2026-11-02", "blood", "TW"), r("2026-11-01", "stats", "TW"), r("2026-11-01", "missing-elders", "US"), r("2026-11-01", "missing-elders", "JP")]);
    expect(out.map((x) => `${x.date} ${x.topic} ${x.country}`)).toEqual([
      "2026-11-01 missing-elders JP", "2026-11-01 missing-elders US", "2026-11-01 stats TW", "2026-11-02 blood TW",
    ]);
  });
});
