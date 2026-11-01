// 全站設定。LAUNCHED 在網域、CDN、npm 套件都上線後改成 true，拿掉「尚未正式上線」提示。
export const LAUNCHED = false;
export const WIDGET = "https://cdn.doorbell.life/widget.js";
export const REPO = "https://github.com/doorbell-life/doorbell-life";

export const NAV_TW = [
  ["/how-it-works/taiwan/", "運作方式"],
  ["/install/taiwan/", "安裝"],
  ["/support/taiwan/", "支援環境"],
  ["/data/taiwan/", "數據"],
] as const;
