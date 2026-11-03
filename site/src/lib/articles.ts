// 文章清單：建置時讀 content collection，有幾篇列幾篇；某地區還沒寫完的題目不顯示（CLAUDE.md §9）。
import { getCollection, type CollectionEntry } from "astro:content";
import type { Region } from "./site";

export const TOPIC_LABEL = {
  missing: "失蹤協尋",
  blood: "捐血",
  animals: "動物",
  webmasters: "給網站管理者",
} as const;
export type ArticleTopic = keyof typeof TOPIC_LABEL;

export const TOPIC_LABEL_EN: Record<ArticleTopic, string> = {
  missing: "Missing persons",
  blood: "Blood donation",
  animals: "Animals",
  webmasters: "For website owners",
};

type Article = CollectionEntry<"articles">;

export const articleUrl = (a: Article) => `/articles/${a.data.region}/${a.data.topic}/${a.id.split("/").pop()}/`;

export async function regionArticles(region: Region, topic?: ArticleTopic) {
  const all = await getCollection("articles", (a) => a.data.region === region && (!topic || a.data.topic === topic));
  const locale = region === "taiwan" ? "zh-Hant" : "en";
  return all.sort((a, b) => a.data.title.localeCompare(b.data.title, locale));
}

export const taiwanArticles = (topic?: ArticleTopic) => regionArticles("taiwan", topic);

// 同一共同題目（frontmatter common）的各地區版本，給 hreflang。沒有 common 或只有一個地區寫了，就不標註。
export async function articleAlternates(a: Article): Promise<Partial<Record<Region, string>> | undefined> {
  if (!a.data.common) return undefined;
  const same = await getCollection("articles", (b) => b.data.common === a.data.common);
  const out: Partial<Record<Region, string>> = {};
  for (const b of same) out[b.data.region] ??= articleUrl(b);
  return Object.keys(out).length > 1 ? out : undefined;
}
