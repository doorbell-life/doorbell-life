// 宣導數字（議題 stats）：人工整理的官方統計，加上每天由 D01 算出的待認養隻數。
import { clean, type Case } from "@doorbell-life/schema";

interface Stat {
  id: string;
  title: string;
  features: string;
  source: { name: string; url: string };
  publishedAt: string;
}

const base = (id: string, title: string, features: string, src: Case["source"], publishedAt: string): Case => ({
  id: `stat-${id}`,
  topic: "stats",
  title: clean(title, 60),
  features: clean(features, 120),
  photo: null,
  country: "TW",
  area: "",
  contentLang: "zh-TW",
  contact: { name: "", phone: "", address: "" },
  source: src,
  publishedAt,
  expiresAt: null,
  offlineCacheable: true, // 宣導數字是離線版的預設內容
});

export function statCases(items: Stat[]): Case[] {
  return items.map((s) =>
    base(s.id, s.title, s.features, { id: "d04", name: s.source.name, url: s.source.url, license: "政府資料開放授權條款第1版" }, s.publishedAt),
  );
}

export function adoptCountCase(n: number, today: string): Case {
  return base(
    "tw-adopt-today",
    `今天全台公立收容所有 ${n.toLocaleString("en-US")} 隻動物等待認養`,
    "認養前可先打電話到收容所詢問開放時間與流程。",
    { id: "d01", name: "農業部 動物認領養", url: "https://data.gov.tw/dataset/85903", license: "政府資料開放授權條款第1版" },
    today,
  );
}
