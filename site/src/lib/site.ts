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
  ["/animals/taiwan/vets/", "動物醫院"],
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

// 地區＝網址第二段（§9 `區塊/地區/內容`），決定語言。hreflang 用 BCP 47 標籤。
export const REGIONS = {
  taiwan: { lang: "zh-Hant-TW", hreflang: "zh-Hant-TW", label: "台灣（繁體中文）" },
  usa: { lang: "en", hreflang: "en-US", label: "United States (English)" },
} as const;
export type Region = keyof typeof REGIONS;
export const isRegion = (s: string | undefined): s is Region => !!s && Object.hasOwn(REGIONS, s);

// 美國地區（英文）的導覽、頁尾與關於頁，結構與台灣版相同。美國沒有走失毛孩頁（來源只有待認養）。
export const NAV_US = [
  ["/how-it-works/usa/", "How it works"],
  ["/install/usa/", "Install"],
  ["/animals/usa/adopt/", "Adopt a pet"],
  ["/articles/usa/", "Articles"],
  ["/data/usa/", "Data"],
  ["/about/usa/", "About"],
] as const;

export const FOOT_US = [
  ["/faq/usa/", "FAQ"],
  ["/missing/usa/", "Missing persons"],
  ["/support/usa/", "Supported hosts"],
  ["/regions/usa/", "Regions"],
] as const;

export const ABOUT_US = [
  ["/about/usa/overview/", "doorbell.life in one minute"],
  ["/about/usa/data-sources/", "Where does the data come from? Who checks it?"],
  ["/about/usa/takedown/", "What happens after someone is found?"],
  ["/about/usa/funding/", "Where does the money come from? Where does it go?"],
  ["/about/usa/sponsors/", "For corporate sponsors"],
  ["/about/usa/investors/", "For investors"],
  ["/about/usa/help/", "How can I help?"],
] as const;

// 頁首、頁尾、上線前提示的文字，依地區。
export const CHROME: Record<Region, { home: string; brand: string; nav: readonly (readonly [string, string])[]; foot: readonly (readonly [string, string])[]; prelaunch: string; footer: string; other?: string }> = {
  taiwan: {
    home: "/",
    brand: "按門鈴",
    nav: NAV_TW,
    foot: FOOT_TW,
    prelaunch: "doorbell.life 尚未正式上線：網域、CDN 與安裝工具準備中，頁面上的安裝方式上線後才能使用。",
    footer: "按門鈴 doorbell.life：開源公益服務。程式碼 MIT，文章 CC BY 4.0。",
  },
  usa: {
    home: "/how-it-works/usa/",
    brand: "doorbell.life",
    nav: NAV_US,
    foot: FOOT_US,
    prelaunch: "doorbell.life has not launched yet. The domain, CDN, and install tools are still being set up, so the install steps on this site won’t work until launch.",
    footer: "doorbell.life is an open-source public-service project. Code is MIT-licensed; articles are CC BY 4.0.",
    other: "This page is also available in:",
  },
};
