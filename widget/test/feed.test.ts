import { describe, expect, it } from "vitest";
import type { Case } from "@doorbell-life/schema";
import { buildFeed, PER_TOPIC, toItem } from "../scripts/feed.ts";

const mk = (id: string, topic: Case["topic"], photo: string | null = null): Case => ({
  id, topic, title: "貓・混種貓", features: "公、成年", photo, country: "TW", area: "臺南市",
  contentLang: "zh-TW", contact: { name: "臺南市動物之家", phone: "(06)2964439", address: "" },
  source: { id: "d01", name: "", url: "", license: "" }, publishedAt: "2026-10-22", expiresAt: null,
  offlineCacheable: true,
});

describe("toItem", () => {
  it("組出元件要的精簡欄位", () => {
    expect(toItem(mk("a", "animals-adopt"))).toEqual({
      k: "animals-adopt", h: "貓・混種貓", d: "臺南市・公、成年", c: "臺南市動物之家 (06)2964439",
    });
  });
  it("來源網站的照片不放進每日檔，只放自家 CDN 的", () => {
    expect(toItem(mk("a", "animals-adopt", "https://www.pet.gov.tw/x.png")).img).toBeUndefined();
    expect(toItem(mk("a", "animals-adopt", "https://cdn.doorbell.life/img/x.webp")).img).toBe("https://cdn.doorbell.life/img/x.webp");
  });
});

describe("buildFeed", () => {
  it("依議題時效排序，每個議題最多 PER_TOPIC 筆", () => {
    const cases = [
      ...Array.from({ length: 30 }, (_, i) => mk(`a${i}`, "animals-adopt")),
      mk("e1", "missing-elders"),
    ];
    const f = buildFeed(cases, "zh-TW", {});
    expect(f.l).toBe("zh-tw");
    expect(f.items[0].k).toBe("missing-elders");
    expect(f.items).toHaveLength(1 + PER_TOPIC);
  });
});
