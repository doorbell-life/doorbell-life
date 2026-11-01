# 靜態網站代管平台

這些平台只能自訂 404。把 doorbell.life 的 404 範本下載成網站根目錄的 `404.html`：

```sh
curl -fsSL -o 404.html https://cdn.doorbell.life/t/zh-TW/404.html
```

| 平台 | 行為 | 官方說明 |
| --- | --- | --- |
| GitHub Pages | 根目錄的 `404.html` 會在找不到頁面時顯示 | [Creating a custom 404 page](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site) |
| Netlify | 根目錄的 `404.html` 會自動用在所有找不到的路徑，狀態碼 404 | [Custom 404 page handling](https://docs.netlify.com/manage/routing/redirects/redirect-options) |
| Vercel | 輸出目錄裡的 `404.html` 會在路由找不到時顯示 | [Custom 404 Page](https://vercel.com/kb/guide/custom-404-page) |
| Cloudflare Pages | 根目錄有 `404.html` 時用它回 404；沒有的話會被當成單頁應用，所有路徑回首頁 | [Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages) |
| Cloudflare Workers 靜態資源 | `assets.not_found_handling` 設成 `"404-page"` | [Static Site Generation](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation) |

以上 2026-11-01 查核。這些平台的官方文件沒有提供自訂 5xx 的方式。
