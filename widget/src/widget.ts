// doorbell.life 嵌入元件。安全規則見 CLAUDE.md §3、§13：只用 textContent，任何失敗都安靜退場。
// 用法：<script src="https://cdn.doorbell.life/widget.js" async data-status="404"
//        data-region="taiwan" data-topics="elders,children" data-brand="id" data-retry="60"></script>
const C = "https://cdn.doorbell.life";
const s = document.currentScript as HTMLScriptElement;
const a = s.dataset;
const st = +(a.status || 404);
const mode = st == 401 || st == 403 ? "l" : st == 429 || st == 503 ? "r" : "c"; // 一行／輪播／卡片
const lang = (a.lang || document.documentElement.lang || navigator.language).toLowerCase();
// 地區：有指定用指定；否則用時區，由 CDN 的 _redirects 對應到地區包（無地區包→跨國宣導）
const src = a.region ? "d/" + a.region : "z/" + Intl.DateTimeFormat().resolvedOptions().timeZone;
const get = (p: string) => fetch(C + "/" + p + ".json").then(r => { if (!r.ok) throw 0; return r.json(); });
const mk = (t: string, c: string, p: Element, x?: string) => {
  const e = document.createElement(t);
  e.className = "dbl-" + c;
  if (x) e.textContent = x; // 一律純文字
  p.append(e);
  return e;
};

Promise.all([get(src), a.brand ? get("b/" + a.brand) : 0]).then(([d, b]) => {
  const want = a.topics && a.topics.split(",");
  const items = d.items.filter((i: any) => !want || want.includes(i.k)); // 已在建置時依議題時效排序
  if (!items.length) throw 0;
  const t = d.t[lang] || d.t[lang.split("-")[0]] || d.t[d.l]; // 介面文字放在資料檔
  const root = document.createElement("aside");
  root.className = "dbl dbl-" + mode;
  root.lang = d.l;
  if (b) for (const k in b.v) root.style.setProperty("--dbl-" + k, b.v[k]); // 品牌主色等
  const box = mk("div", "b", root);
  const show = (i: any) => {
    box.textContent = "";
    if (i.img && i.img.startsWith(C + "/") && mode != "l") (mk("img", "i", box) as HTMLImageElement).src = i.img; // 只接受自家 CDN 圖
    mk("strong", "h", box, i.h);
    if (mode != "l") mk("p", "d", box, i.d);
    mk("p", "c", box, i.c);
    navigator.sendBeacon && Math.random() < .1 && navigator.sendBeacon(C + "/s?h=" + location.hostname + "&k=" + i.k); // 抽樣 1/10
  };
  const top = items.filter((i: any) => i.k == items[0].k);
  let n = items.indexOf(top[Math.random() * top.length | 0]), k = 0;
  show(items[n]);
  if (mode == "r") {
    let w = +(a.retry || 0);
    const cd = w ? mk("p", "w", root) : 0;
    setInterval(() => {
      if (cd) cd.textContent = w > 0 ? t.wait.replace("#", w--) : t.retry;
      if (++k % 8 == 0) show(items[++n % items.length]);
    }, 1e3);
  }
  const by = mk("a", "s", root, t.by) as HTMLAnchorElement;
  by.href = "https://doorbell.life/";
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = C + "/w.css";
  css.onload = () => s.after(root); // 樣式到了才插入，避免閃爍；任何失敗都不插入＝安靜退場
  document.head.append(css);
}).catch(() => {});
