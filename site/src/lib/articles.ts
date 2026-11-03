// 文章清單：建置時讀 content collection，有幾篇列幾篇；某地區還沒寫完的題目不顯示（CLAUDE.md §9）。
import { getCollection, type CollectionEntry } from "astro:content";

export const TOPIC_LABEL = {
  missing: "失蹤協尋",
  blood: "捐血",
  animals: "動物",
  webmasters: "給網站管理者",
} as const;
export type ArticleTopic = keyof typeof TOPIC_LABEL;

export const articleUrl = (a: CollectionEntry<"articles">) => `/articles/${a.data.region}/${a.data.topic}/${a.id.split("/").pop()}/`;

export async function taiwanArticles(topic?: ArticleTopic) {
  const all = await getCollection("articles", (a) => a.data.region === "taiwan" && (!topic || a.data.topic === topic));
  return all.sort((a, b) => a.data.title.localeCompare(b.data.title, "zh-Hant"));
}
