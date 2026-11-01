# wordpress-plugin

doorbell.life 的 WordPress 外掛，授權 GPL-2.0-or-later。外掛本體在 `doorbell-life/`。

- 404 頁：載入短停留卡片元件，狀態碼由 WordPress 照常設定。
- 維護模式（503）：後台一鍵產生 `wp-content/maintenance.php`，只處理自己產生的檔案，不覆蓋別人的；停用外掛時自動移除。
- 設定頁：設定 → doorbell.life（介面語言、地區、議題）。

測試：`sh wordpress-plugin/test/run.sh`（需要 Docker，會架起 WordPress 實際驗證）。
