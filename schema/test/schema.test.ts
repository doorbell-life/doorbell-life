import { describe, expect, it } from "vitest";
import { clean, cleanUrl, invalidReason, isExpired, type Case } from "../src/index.ts";

describe("clean", () => {
  it("把角括號換成全形，不留下可被當成 HTML 的字元", () => {
    expect(clean('<img src=x onerror="alert(1)">')).toBe('＜img src=x onerror="alert(1)"＞');
  });
  it("移除控制字元並收合空白（實際資料：animal_foundplace 夾 tab）", () => {
    expect(clean("東華里\t立農街二段")).toBe("東華里 立農街二段");
  });
  it("移除雙向文字控制與零寬字元", () => {
    expect(clean("abc‮def​ghi")).toBe("abcdefghi");
  });
  it("超過長度截斷並加刪節號", () => {
    expect(clean("一二三四五", 3)).toBe("一二…");
  });
  it("null、undefined 變空字串", () => {
    expect(clean(null)).toBe("");
    expect(clean(undefined)).toBe("");
  });
});

describe("cleanUrl", () => {
  it("只接受 https", () => {
    expect(cleanUrl("https://www.pet.gov.tw/upload/pic/1.png")).toBe("https://www.pet.gov.tw/upload/pic/1.png");
    expect(cleanUrl("http://example.com/a.png")).toBeNull();
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
    expect(cleanUrl("")).toBeNull();
  });
});

const base: Case = {
  id: "d01-1",
  topic: "animals-adopt",
  title: "貓",
  features: "",
  photo: null,
  country: "TW",
  area: "臺南市",
  contentLang: "zh-TW",
  contact: { name: "", phone: "", address: "" },
  source: { id: "d01", name: "", url: "", license: "" },
  publishedAt: "2026-10-22",
  expiresAt: null,
  offlineCacheable: true,
};

describe("invalidReason", () => {
  it("合格資料回傳 null", () => {
    expect(invalidReason(base)).toBeNull();
  });
  it("失蹤人口個案標成可離線快取要擋下", () => {
    expect(invalidReason({ ...base, topic: "missing-children" })).toBe("失蹤人口個案不得進離線版");
  });
  it("日期格式錯誤要擋下", () => {
    expect(invalidReason({ ...base, publishedAt: "2026/10/22" })).toMatch(/上架日/);
  });
});

describe("isExpired", () => {
  it("到期日早於今天才算過期", () => {
    expect(isExpired({ ...base, expiresAt: "2026-10-30" }, "2026-10-31")).toBe(true);
    expect(isExpired({ ...base, expiresAt: "2026-10-31" }, "2026-10-31")).toBe(false);
    expect(isExpired(base, "2026-10-31")).toBe(false);
  });
});
