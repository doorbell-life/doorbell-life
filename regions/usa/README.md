# regions/usa

美國地區包。規劃見根目錄 CLAUDE.md。`pnpm sync` 產生 `out/mc-adopt.json` 與 `out/stats.json`。

| 檔案 | 內容 | 來源 |
| --- | --- | --- |
| `src/mc.ts` | 待認養動物（animals-adopt） | Montgomery County, MD「Adoptable Pets」，https://data.montgomerycountymd.gov/Public-Safety/Adoptable-Pets/e54u-qx42 ，Public Domain，不需金鑰 |
| `stats.json` | 宣導數字 | FBI, 2025 NCIC Missing Person and Unidentified Person Statistics |
| `hotlines.json` | 離線 5xx 頁的求助專線 | 各專線官方網站 |
| `region.json` | 時區 | IANA tzdb 2026f `zone.tab` 的 US 時區，另加瀏覽器回報的兩個舊名 |

## 沒有做的

- **失蹤兒童個案**：NCMEC 有 RSS（https://www.missingkids.org/supportus/share/rss ），但使用條款（https://www.missingkids.org/footer/termsandconditions ）禁止修改內容、衍生使用、以程式擷取，也禁止用於贊助目的。我們會改寫格式、由排程程式抓取，服務又有 ESG 贊助，因此不使用。
- **RescueGroups 待認養動物**：需要 API 金鑰。
