import { describe, expect, it } from "vitest";
import { checkContent } from "../src/lib/practice/engine.ts";
import cat from "../src/lib/practice/content/cat.ts";
import dog from "../src/lib/practice/content/dog.ts";
import rabbit from "../src/lib/practice/content/rabbit.ts";

describe("飼養體驗遊戲內容：狗、貓、兔子", () => {
  for (const c of [dog, cat, rabbit]) {
    it(`${c.name}的內容通過檢查`, () => {
      expect(checkContent(c)).toEqual([]);
    });
    it(`${c.name}：照顧項目 4 到 6 項、id 不重複，每題 2 到 3 個選項`, () => {
      expect(c.tasks.length).toBeGreaterThanOrEqual(4);
      expect(c.tasks.length).toBeLessThanOrEqual(6);
      expect(new Set(c.tasks.map((t) => t.id)).size).toBe(c.tasks.length);
      for (const e of c.events) {
        expect(e.choices.length).toBeGreaterThanOrEqual(2);
        expect(e.choices.length).toBeLessThanOrEqual(3);
      }
    });
    it(`${c.name}：文章連結都指向台灣動物文章`, () => {
      for (const a of c.articles) expect(a.url).toMatch(/^\/articles\/taiwan\/animals\/[a-z0-9-]+\/$/);
    });
  }
});
