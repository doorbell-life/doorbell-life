import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkContent } from "../src/lib/practice/engine.ts";
import bird from "../src/lib/practice/content/bird.ts";
import guineaPig from "../src/lib/practice/content/guinea-pig.ts";
import hamster from "../src/lib/practice/content/hamster.ts";

describe("飼養體驗遊戲內容：天竺鼠、倉鼠、鳥", () => {
  for (const [id, c] of [["guinea-pig", guineaPig], ["hamster", hamster], ["bird", bird]] as const) {
    it(`${id} 內容合格`, () => {
      expect(c.id).toBe(id);
      expect(checkContent(c)).toEqual([]);
      expect(c.tasks.length).toBeGreaterThanOrEqual(4);
      expect(c.tasks.length).toBeLessThanOrEqual(6);
      for (const e of c.events) expect(e.choices.length).toBeGreaterThanOrEqual(2);
      for (const e of c.events) expect(e.choices.length).toBeLessThanOrEqual(3);
      expect(new Set(c.tasks.map((t) => t.id)).size).toBe(c.tasks.length);
      for (const a of c.articles) {
        const slug = a.url.match(/^\/articles\/taiwan\/animals\/([a-z0-9-]+)\/$/)?.[1];
        expect(slug, a.url).toBeTruthy();
        expect(existsSync(new URL(`../src/content/articles/taiwan/animals/${slug}.md`, import.meta.url)), a.url).toBe(true);
      }
    });
  }
});
