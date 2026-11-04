// doorbell.life 嵌入元件。安全規則見 CLAUDE.md §3、§13：只用 textContent，任何失敗都安靜退場。
// 用法：<script src="https://cdn.doorbell.life/widget.js" async data-status="404"
//        data-region="taiwan" data-topics="elders,children" data-brand="id" data-retry="60"></script>
const C = "https://cdn.doorbell.life";
const s = document.currentScript as HTMLScriptElement;
const a = s.dataset;
const st = +a.status! || 404; // 沒給或不是數字時 +undefined＝NaN，退回 404
const mode = st == 401 || st == 403 ? "l" : st == 429 || st == 503 ? "r" : "c"; // 一行／輪播／卡片
const lang = (a.lang || document.documentElement.lang || navigator.language).toLowerCase();
// 地區：有指定用指定；否則用時區，由 CDN 的 _redirects 對應到地區包（無地區包→跨國宣導）
const src = a.region ? "d/" + a.region : "z/" + Intl.DateTimeFormat().resolvedOptions().timeZone;
const get = (p: string) => fetch(C + "/" + p + ".json").then(r => r.ok && r.json()); // 非 2xx 得 false：資料檔→後面取 items 出錯退場；品牌檔→預設樣式
const cdn = (u: any) => (u + "").startsWith(C + "/"); // 圖片、Logo 只接受自家 CDN
const mk = (t: string, c: string, p?: Element, x?: string) => {
  const e = document.createElement(t);
  e.className = "dbl-" + c;
  if (x) e.textContent = x; // 一律純文字
  p?.append(e);
  return e;
};

// 品牌設定讀不到時用預設樣式照常顯示（個案資料沒問題，不必退場）
Promise.all([get(src), a.brand && get("b/" + a.brand).catch(() => 0)]).then(([d, b]) => {
  const want = a.topics?.split(",");
  const items = d.items.filter((i: any) => !want || want.includes(i.k)); // 已在建置時依議題時效排序
  if (!items.length) throw 0;
  const t = d.t[lang] || d.t[lang.split("-")[0]] || d.t[d.l]; // 介面文字放在資料檔
  const root = mk("aside", "");
  root.lang = d.l;
  // 品牌變數放在 --b- 命名空間，CSS 只在版型 class（dbl-bell 等）讀 --b-brand／--b-brand-o，且只用在只吃顏色的屬性，
  // 所以品牌設定無法蓋掉中性樣式，也無法塞 url() 載入外部資源
  if (b) for (const k in b.v) root.style.setProperty("--b-" + k, b.v[k]);
  const tp = b && /^(full-image|one-line)$/.test(b.t) ? b.t : "bell"; // 版型只認這三種
  if (mode != "l") mk("p", "t", root, t.title); // 「有人需要幫忙」，前面的橘色圓點由 CSS 畫
  const box = mk("div", "b", root);
  const show = (i: any) => {
    box.textContent = "";
    const m = /^missing-/.test(i.k); // 失蹤協尋一律中性樣式，品牌只留角落小字（CLAUDE.md §6）
    root.className = "dbl dbl-" + mode + (b && !m ? " dbl-" + tp : ""); // 有版型 class＝套品牌
    if (cdn(i.img) && mode != "l") (mk("img", "i", box) as HTMLImageElement).src = i.img; // 只接受自家 CDN 圖
    mk("strong", "h", box, i.h);
    if (mode != "l") mk("p", "d", box, i.d);
    mk("p", "n", box, i.c); // class 不能用 c：卡片模式的外框是 dbl-c
    if (b) {
      const o = mk("p", "o", box, t.sup.replace("#", () => b.n)); // 「由 {品牌} 支持」，純文字
      if (!m && cdn(b.logo)) (mk("img", "g", o) as HTMLImageElement).src = b.logo;
    }
    navigator.sendBeacon && Math.random() < .1 && navigator.sendBeacon(C + "/s?h=" + location.hostname + "&k=" + i.k); // 抽樣 1/10
  };
  const top = items.filter((i: any) => i.k == items[0].k);
  let n = items.indexOf(top[Math.random() * top.length | 0]), k = 0;
  show(items[n]);
  if (mode == "r") {
    let w = +a.retry! || 0;
    const cd = w ? mk("p", "w", root) : 0;
    setInterval(() => {
      if (cd) cd.textContent = w > 0 ? t.wait.replace("#", w--) : t.retry;
      if (++k % 8 == 0) show(items[++n % items.length]);
    }, 1e3);
  }
  const by = mk("a", "s", root, t.by) as HTMLAnchorElement;
  by.href = "https://doorbell.life/";
  const css = mk("link", "") as HTMLLinkElement;
  css.rel = "stylesheet";
  css.href = C + "/w.css";
  css.onload = () => s.after(root); // 樣式到了才插入，避免閃爍；任何失敗都不插入＝安靜退場
  document.head.append(css);
}).catch(() => {});
