import { describe, expect, it } from "vitest";
import { missingTexts } from "./watch-sources.ts";

describe("指定文字檢查", () => {
  it("只看頁面文字，不看標籤與程式", () => {
    const html = "<html><script>var x='911'</script><p>Call <b>911</b> now</p></html>";
    expect(missingTexts(html, ["911"])).toEqual([]);
    expect(missingTexts("<script>1-800-843-5678</script>", ["1-800-843-5678"])).toEqual(["1-800-843-5678"]);
  });
});
