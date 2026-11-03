// 宣導數字（議題 stats）：人工整理的官方統計，加上每天由 Adoptable Pets 算出的待認養隻數。
import { clean, type Case } from "@doorbell-life/schema";
import { SHELTER } from "./mc.ts";

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
  title: clean(title, 80),
  features: clean(features, 140),
  photo: null,
  country: "US",
  area: "",
  contentLang: "en",
  contact: { name: "", phone: "", address: "" },
  source: src,
  publishedAt,
  expiresAt: null,
  offlineCacheable: true, // 宣導數字是離線版的預設內容
});

// 美國聯邦政府著作不受著作權保護（17 U.S.C. § 105）
export function statCases(items: Stat[]): Case[] {
  return items.map((s) =>
    base(s.id, s.title, s.features, { id: "fbi-ncic", name: s.source.name, url: s.source.url, license: "Public Domain" }, s.publishedAt),
  );
}

export function adoptCountCase(n: number, today: string): Case {
  return base(
    "us-mc-adopt-today",
    `${n.toLocaleString("en-US")} animals are waiting for a home at the Montgomery County, MD shelter today`,
    `Call ${SHELTER.phone} to ask about visiting hours and how to adopt.`,
    { id: "mc-adopt", name: "Montgomery County, MD – Adoptable Pets", url: "https://data.montgomerycountymd.gov/Public-Safety/Adoptable-Pets/e54u-qx42", license: "Public Domain" },
    today,
  );
}
