import { describe, expect, it } from "vitest";
import { collect, judge } from "./check-links.ts";

describe("連結檢查", () => {
  it("判斷：擋程式算無法檢查、404 算失效、PDF 變網頁算失效", () => {
    expect(judge("https://a/x", 200, "text/html")).toBe("ok");
    expect(judge("https://a/x", 403, "")).toBe("blocked");
    expect(judge("https://a/x", 405, "")).toBe("blocked");
    expect(judge("https://a/x", 404, "text/html")).toBe("broken");
    expect(judge("https://a/x.pdf", 200, "text/html; charset=utf-8", 1)).toBe("broken");
    expect(judge("https://a/x.pdf", 200, "text/html; charset=utf-8", 0)).toBe("blocked");
    expect(judge("https://a/x.pdf", 200, "application/pdf")).toBe("ok");
  });
  it("收集到文章與比較表引用的網址", () => {
    const urls = collect();
    expect(urls.size).toBeGreaterThan(100);
    expect([...urls.keys()].every((u) => /^https?:\/\//.test(u))).toBe(true);
  });
});
