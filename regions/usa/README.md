# regions/usa

美國地區包。規劃見根目錄 CLAUDE.md。`pnpm sync` 產生 `out/mc-adopt.json` 與 `out/stats.json`。

| 檔案 | 內容 | 來源 |
| --- | --- | --- |
| `src/mc.ts` | 待認養動物（animals-adopt） | Montgomery County, MD「Adoptable Pets」，https://data.montgomerycountymd.gov/Public-Safety/Adoptable-Pets/e54u-qx42 ，Public Domain，不需金鑰 |
| `stats.json` | 宣導數字 | FBI, 2025 NCIC Missing Person and Unidentified Person Statistics |
| `hotlines.json` | 離線 5xx 頁的求助專線 | 各專線官方網站 |
| `region.json` | 時區 | IANA tzdb 2026f `zone.tab` 的 US 時區，另加瀏覽器回報的兩個舊名 |

## 沒有做的

- **失蹤協尋個案**：FBI Wanted API 的失蹤協尋海報（https://api.fbi.gov/wanted/v1/list?poster_classification=missing ）。fbi.gov 隱私權政策寫明站上未另行標示出處的資訊屬公共資訊、可散布或複製，但不得使用 FBI 徽章或暗示背書（https://www.fbi.gov/privacy-policy ）。失蹤時未滿 18 歲歸兒少，年齡算不出來歸成人；全部不進離線版。api.fbi.gov 擋 Node 內建 fetch，同步改用 curl，User-Agent 照實標明身分。異常時輸出空檔、暫停顯示失蹤個案。
- **NCMEC 不使用**：RSS（https://www.missingkids.org/supportus/share/rss ）的使用條款（https://www.missingkids.org/footer/termsandconditions ）禁止公開顯示、inline linking 與程式擷取，例外只有官方橫幅、海報與連結。
- **RescueGroups 待認養動物**：需要 API 金鑰。
