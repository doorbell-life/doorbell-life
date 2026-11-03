// 文章格式（CLAUDE.md §9）：一篇只回答一個問題，標題就是問題，第一句就是答案，每個事實附當地官方來源。
// 檔案放 src/content/articles/{地區}/{議題}/{代稱}.md，網址 /articles/{地區}/{議題}/{代稱}/。
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const articles = defineCollection({
  loader: glob({ pattern: "**/[!R]*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(), // 問題本身，例如「家人失蹤，第一個小時該做什麼？」
    description: z.string(), // 第一句答案，也用於搜尋摘要
    region: z.enum(["taiwan", "usa"]),
    topic: z.enum(["missing", "blood", "animals", "webmasters"]),
    common: z.string().optional(), // 共同題目代碼，同一題各地區版本用它互相標註（hreflang）
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // 最後一次查核來源的日期
    sources: z
      .array(z.object({ name: z.string(), url: z.string().url(), checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .min(1),
    series: z.enum(["care", "temporary-care"]).optional(), // 飼養系列、臨時照顧系列（§9）
    species: z.array(z.enum(["dog", "cat", "rabbit", "guinea-pig", "hamster", "bird", "wildlife"])).optional(),
    // 可列印的精簡檢查表（臨時照顧系列必填）：每項一句可以照做的動作，列印頁在 {文章網址}checklist/
    checklist: z.array(z.string()).optional(),
  }),
});

export const collections = { articles };
