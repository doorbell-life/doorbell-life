# doorbell-life CLI

偵測網站架構、列出變更，確認後才寫入。

```sh
npx doorbell-life install            # 在網站專案資料夾執行
npx doorbell-life install --yes      # 不詢問，直接寫入
npx doorbell-life detect             # 只偵測
npx doorbell-life snippet 404        # 印出要貼到錯誤頁的一行 script
```

| 偵測到 | 會做的事 |
| --- | --- |
| 靜態網站（Astro、Vite、SvelteKit、Nuxt、Gatsby、Hugo、Jekyll、純 HTML） | 沒有 404.html 就下載範本；已有就只在 `</body>` 前加一行 script，不覆蓋 |
| Nginx、Apache 伺服器 | 下載 14 個範本到 `/var/www/doorbell-life/`、每日更新的 cron、設定片段；把設定掛進網站與重新載入留給你自己做 |
| WordPress | 提示改用外掛 |

選項：`--lang zh-TW|en`（4xx 介面語言）、`--region taiwan`（5xx 離線內容的地區）。
