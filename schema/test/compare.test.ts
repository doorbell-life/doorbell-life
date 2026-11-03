import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkCompareFile, COMPARE_TOPICS } from "../src/compare.ts";

describe("比較欄位", () => {
  it("每題 4 個欄位，key 不重複", () => {
    for (const t of COMPARE_TOPICS) {
      expect(t.fields).toHaveLength(4);
      expect(new Set(t.fields.map((f) => f.key)).size).toBe(4);
    }
  });
  it("檢查會抓出沒來源、未定義欄位、空值", () => {
    const t = COMPARE_TOPICS[0];
    expect(checkCompareFile(t, { fields: { "waiting-period": null } })).toEqual([]);
    expect(checkCompareFile(t, { fields: { nope: null } })[0]).toMatch(/未定義/);
    expect(checkCompareFile(t, { fields: { "waiting-period": { value: "x", sources: [] } } })[0]).toMatch(/沒有來源/);
    expect(checkCompareFile(t, { fields: { "waiting-period": { value: "", sources: [{ name: "a", url: "https://a", checkedAt: "2026-11-03" }] } } })[0]).toMatch(/空的/);
  });
  it("各地區已填的比較檔都合格", () => {
    for (const region of ["taiwan", "usa"]) {
      for (const t of COMPARE_TOPICS) {
        const f = new URL(`../../regions/${region}/compare/${t.id}.json`, import.meta.url);
        if (!existsSync(f)) continue;
        expect(checkCompareFile(t, JSON.parse(readFileSync(f, "utf8")))).toEqual([]);
      }
    }
  });
});
