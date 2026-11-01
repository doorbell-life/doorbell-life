import { describe, expect, it } from "vitest";
import type { Case } from "@doorbell-life/schema";
import { esc, offlineCases, render4xx, renderOffline, type Pages } from "../src/render.ts";

const p: Pages = {
  status: { "404": "找不到這個頁面", "500": "網站發生錯誤", "503": "網站維護中" },
  home: "回到首頁", offline: "網站暫時無法服務", hotlines: "求助專線", stats: "你知道嗎",
  animals: "等待認養", cachedAt: "資料日期：#", by: "由 doorbell.life 按門鈴提供",
};
const mk = (id: string, topic: Case["topic"], extra: Partial<Case> = {}): Case => ({
  id, topic, title: `標題${id}`, features: "特徵", photo: null, country: "TW", area: "臺南市", contentLang: "zh-TW",
  contact: { name: "收容所", phone: "(06)123", address: "" }, source: { id: "x", name: "來源", url: "", license: "" },
  publishedAt: "2026-10-01", expiresAt: null, offlineCacheable: true, ...extra,
});
const hot = [{ name: "113 保護專線", number: "113", hours: "24 小時" }];

describe("esc", () => {
  it("跳脫所有 HTML 特殊字元", () => {
    expect(esc(`<a href="x" onclick='y'>&`)).toBe("&#60;a href=&#34;x&#34; onclick=&#39;y&#39;&#62;&#38;");
  });
});

describe("offlineCases", () => {
  it("排除失蹤人口、不可快取、過期的個案", () => {
    const cases = [
      mk("a", "animals-adopt"),
      mk("m", "missing-children", { offlineCacheable: false }),
      mk("m2", "missing-elders"),
      mk("n", "animals-adopt", { offlineCacheable: false }),
      mk("e", "animals-lost", { expiresAt: "2026-10-01" }),
    ];
    expect(offlineCases(cases, "2026-11-01").map((c) => c.id)).toEqual(["a"]);
  });
});

describe("render4xx", () => {
  it("包含錯誤說明與元件，元件帶狀態碼", () => {
    const html = render4xx(404, "zh-TW", p, "");
    expect(html).toContain("<h1>找不到這個頁面</h1>");
    expect(html).toContain('data-status="404"');
  });
});

describe("renderOffline", () => {
  it("5xx 不含 script，含專線、數字、快取日期；惡意內容被跳脫", () => {
    const html = renderOffline(500, "zh-TW", "taiwan", p, "", hot,
      [mk("s", "stats"), mk("a", "animals-adopt", { title: "<script>alert(1)</script>" }), mk("m", "missing-elders")], "2026-11-01");
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("&#60;script&#62;alert(1)&#60;/script&#62;");
    expect(html).toContain('<span class="tel">113</span>');
    expect(html).toContain("資料日期：2026-11-01");
    expect(html).not.toContain("標題m");
  });
  it("503 帶等待輪播元件與地區", () => {
    const html = renderOffline(503, "zh-TW", "taiwan", p, "", hot, [], "2026-11-01");
    expect(html).toContain('data-status="503" data-region="taiwan"');
  });
});
