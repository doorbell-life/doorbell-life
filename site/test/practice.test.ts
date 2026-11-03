import { describe, expect, it } from "vitest";
import { canPlay, checkContent, DAYS, gameDay, missedDays, newState, parseState, record, result, type SpeciesContent } from "../src/lib/practice/engine.ts";

// 只測規則用的假內容，不會出現在網站上
const src = { name: "測試", url: "https://example.com/" };
const content: SpeciesContent = {
  id: "test", name: "測試", missed: "x",
  tasks: [{ id: "water", text: "換水", why: "y", source: src }, { id: "food", text: "餵食", why: "y", source: src }],
  events: Array.from({ length: DAYS }, () => ({ prompt: "p", choices: [{ text: "對", ok: true, why: "y", source: src }, { text: "錯", ok: false, why: "y", source: src }] })),
  articles: [{ title: "t", url: "/x/" }],
};
const full = { tasks: ["water", "food"], answer: 0 };

describe("跨天", () => {
  it("開始那天是第 1 天，跨月也算對，超過 7 天回傳 8", () => {
    expect(gameDay("2026-11-03", "2026-11-03")).toBe(1);
    expect(gameDay("2026-10-30", "2026-11-02")).toBe(4);
    expect(gameDay("2026-11-03", "2026-12-01")).toBe(DAYS + 1);
    expect(gameDay("2026-11-03", "2026-11-01")).toBe(1);
  });
  it("一天只能照顧一次", () => {
    let s = newState("test", "2026-11-03");
    expect(canPlay(s, "2026-11-03")).toBe(true);
    s = record(s, 1, full);
    expect(canPlay(s, "2026-11-03")).toBe(false);
    expect(record(s, 1, { tasks: [], answer: 1 }).log[1]).toEqual(full);
    expect(canPlay(s, "2026-11-04")).toBe(true);
  });
  it("沒來照顧的日子會被記下", () => {
    let s = newState("test", "2026-11-03");
    s = record(s, 1, full);
    expect(missedDays(s, "2026-11-06")).toEqual([2, 3]);
  });
});

describe("結果", () => {
  it("7 天都來、照顧項目全做、狀況全對：準備好了", () => {
    let s = newState("test", "2026-11-01");
    for (let d = 1; d <= DAYS; d++) s = record(s, d, full);
    expect(result(s, content, "2026-11-08").level).toBe("ready");
  });
  it("漏了兩天：還沒準備好", () => {
    let s = newState("test", "2026-11-01");
    for (let d = 1; d <= DAYS - 2; d++) s = record(s, d, full);
    expect(result(s, content, "2026-11-08")).toMatchObject({ missed: 2, level: "not-yet" });
  });
  it("漏一天、其他都做到：差一點", () => {
    let s = newState("test", "2026-11-01");
    for (let d = 1; d <= DAYS - 1; d++) s = record(s, d, full);
    expect(result(s, content, "2026-11-08").level).toBe("almost");
  });
});

describe("儲存資料不信任", () => {
  it("格式錯、天數超出範圍、不是 JSON 都當作沒有進度", () => {
    expect(parseState("nope")).toBeNull();
    expect(parseState(JSON.stringify({ v: 1, species: "dog", start: "2026-11-03", log: { 9: { tasks: [], answer: 0 } } }))).toBeNull();
    expect(parseState(JSON.stringify({ v: 2 }))).toBeNull();
  });
  it("正常資料讀回，奇怪的欄位被丟掉", () => {
    const s = parseState(JSON.stringify({ v: 1, species: "dog", start: "2026-11-03", log: { 1: { tasks: ["water", 5], answer: "x" } }, extra: 1 }));
    expect(s).toEqual({ v: 1, species: "dog", start: "2026-11-03", log: { 1: { tasks: ["water"], answer: null } } });
  });
});

describe("內容檢查", () => {
  it("合格內容沒有錯誤；缺來源、天數不對會被抓出來", () => {
    expect(checkContent(content)).toEqual([]);
    expect(checkContent({ ...content, events: content.events.slice(1) })[0]).toMatch(/剛好 7 個/);
    expect(checkContent({ ...content, tasks: [{ id: "a", text: "a", why: "", source: src }] })[0]).toMatch(/缺理由或來源/);
  });
});
