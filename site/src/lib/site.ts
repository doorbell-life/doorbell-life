// 全站設定。LAUNCHED 在網域、CDN、npm 套件都上線後改成 true，拿掉「尚未正式上線」提示。
export const LAUNCHED = false;
export const WIDGET = "https://cdn.doorbell.life/widget.js";
export const REPO = "https://github.com/doorbell-life/doorbell-life";

export const NAV_TW = [
  ["/how-it-works/taiwan/", "運作方式"],
  ["/install/taiwan/", "安裝"],
  ["/animals/taiwan/adopt/", "認養動物"],
  ["/articles/taiwan/", "文章"],
  ["/data/taiwan/", "數據"],
  ["/about/taiwan/", "關於"],
] as const;

// 頁尾連結：導覽放不下、但每頁都該找得到的頁面。
export const FOOT_TW = [
  ["/faq/taiwan/", "常見問題"],
  ["/missing/taiwan/", "失蹤協尋"],
  ["/animals/taiwan/lost/", "走失毛孩"],
  ["/support/taiwan/", "支援環境"],
  ["/regions/taiwan/", "支援地區"],
] as const;

// 關於頁（CLAUDE.md §9 about/）：給非技術讀者的說明頁。
export const ABOUT_TW = [
  ["/about/taiwan/overview/", "一分鐘看懂按門鈴"],
  ["/about/taiwan/data-sources/", "資料從哪裡來？誰把關？"],
  ["/about/taiwan/takedown/", "找到之後怎麼辦？"],
  ["/about/taiwan/funding/", "錢從哪裡來？用在哪裡？"],
  ["/about/taiwan/sponsors/", "給企業贊助者"],
  ["/about/taiwan/investors/", "給投資人"],
  ["/about/taiwan/help/", "我能怎麼幫忙？"],
] as const;
