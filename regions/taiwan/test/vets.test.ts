import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { centroid, district, NO_DISTRICT, parseVets } from "../src/vets.ts";

// 2026-11-03 從防檢署開業執照資料抓下的 5 筆：一般、異體字「巿」、地址沒寫行政區、非「動物醫院」名稱、補發
const fixture = JSON.parse(readFileSync(new URL("./fixtures/vets.json", import.meta.url), "utf8"));

describe("district", () => {
  it("從地址解析行政區", () => {
    expect(district("宜蘭縣", "宜蘭縣宜蘭市大東里新民路六十八號")).toBe("宜蘭市");
    expect(district("臺南市", "臺南市東區東門路")).toBe("東區");
  });
  it("台／臺、巿／市統一", () => {
    expect(district("臺中市", "台中市大里區")).toBe("大里區");
    expect(district("基隆市", "基隆巿七堵區明德一路125號")).toBe("七堵區");
  });
  it("名稱本身含鎮、市的行政區不會被截斷", () => {
    expect(district("桃園市", "桃園市平鎮區環南路")).toBe("平鎮區");
    expect(district("臺南市", "臺南市新市區中山路")).toBe("新市區");
    expect(district("高雄市", "高雄市前鎮區一心一路")).toBe("前鎮區");
  });
  it("舊名、錯字與異體字對到官方名稱", () => {
    expect(district("彰化縣", "彰化縣員林鎮中山路")).toBe("員林市");
    expect(district("南投縣", "南投縣埔里區中正路")).toBe("埔里鎮");
    expect(district("彰化縣", "彰化縣溪洲鄉中山路")).toBe("溪州鄉");
  });
  it("中心點來自官方界線", () => {
    expect(centroid("臺北市", "中正區")).toEqual([25.0325, 121.5199]);
    expect(centroid("新竹市", NO_DISTRICT)).toBeNull();
  });
  it("地址沒寫行政區時不推測", () => {
    expect(district("新竹市", "新竹市東光路25號")).toBe(NO_DISTRICT);
  });
});

describe("parseVets", () => {
  it("轉出名錄欄位", () => {
    expect(parseVets(fixture)[0]).toEqual({
      county: "宜蘭縣", district: "宜蘭市", name: "德生動物醫院", vet: "江彥德", type: "獸醫師",
      phone: "(039)312162", address: "宜蘭縣宜蘭市大東里新民路六十八號", licensedAt: "2004-02-24",
    });
  });
  it("空資料、缺欄位、不是陣列都視為異常", () => {
    expect(() => parseVets([])).toThrow("空的");
    const { 機構電話, ...rest } = fixture[0];
    expect(() => parseVets([rest])).toThrow("機構電話");
    expect(() => parseVets({})).toThrow("不是陣列");
  });
  it("惡意字元被過濾", () => {
    expect(parseVets([{ ...fixture[0], 機構名稱: "<script>x</script>醫院" }])[0].name).toBe("＜script＞x＜/script＞醫院");
  });
});
