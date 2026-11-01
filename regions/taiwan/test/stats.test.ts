import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invalidReason } from "@doorbell-life/schema";
import { adoptCountCase, statCases } from "../src/stats.ts";

const stats = JSON.parse(readFileSync(new URL("../stats.json", import.meta.url), "utf8"));

describe("stats", () => {
  it("每筆人工整理的數字都有來源網址、發布日與查核日", () => {
    for (const s of stats.items) {
      expect(s.source.url).toMatch(/^https:\/\//);
      expect(s.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("轉出的個案都符合統一格式", () => {
    for (const c of [...statCases(stats.items), adoptCountCase(8679, "2026-11-01")]) {
      expect(invalidReason(c)).toBeNull();
      expect(c.topic).toBe("stats");
    }
  });
  it("待認養隻數加千分位", () => {
    expect(adoptCountCase(8679, "2026-11-01").title).toBe("今天全台公立收容所有 8,679 隻動物等待認養");
  });
});
