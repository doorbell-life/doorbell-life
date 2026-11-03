import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invalidReason } from "@doorbell-life/schema";
import { adoptCountCase, statCases } from "../src/stats.ts";

const read = (f: string) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));
const stats = read("stats.json");

describe("stats", () => {
  it("每筆人工整理的數字都有來源網址、發布日與查核日", () => {
    for (const s of stats.items) {
      expect(s.source.url).toMatch(/^https:\/\//);
      expect(s.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("轉出的個案都符合統一格式，且文字沒有被截斷", () => {
    for (const c of [...statCases(stats.items), adoptCountCase(73, "2026-11-03")]) {
      expect(invalidReason(c)).toBeNull();
      expect(c.topic).toBe("stats");
      expect(c.country).toBe("US");
      expect(c.title + c.features).not.toContain("…");
    }
  });
  it("待認養隻數加千分位", () => {
    expect(adoptCountCase(1234, "2026-11-03").title).toMatch(/^1,234 animals/);
  });
});

describe("region pack", () => {
  it("每支專線都有官方來源與查核日", () => {
    for (const h of read("hotlines.json").items) {
      expect(h.number).toBeTruthy();
      expect(h.source).toMatch(/^https:\/\//);
      expect(h.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("時區都是有效的 IANA 名稱且不重複", () => {
    const tz: string[] = read("region.json").timezones;
    expect(new Set(tz).size).toBe(tz.length);
    for (const z of tz) expect(() => new Intl.DateTimeFormat("en", { timeZone: z })).not.toThrow();
  });
  it("瀏覽器回報的時區名稱都對得到（例如 ICU 把 America/Indiana/Indianapolis 回報成 America/Indianapolis）", () => {
    const tz: string[] = read("region.json").timezones;
    for (const z of tz) expect(tz).toContain(new Intl.DateTimeFormat("en", { timeZone: z }).resolvedOptions().timeZone);
  });
});
