// 錯誤頁範本（CLAUDE.md §6）。
// - 4xx：基本錯誤說明＋短停留卡片元件。元件失效時，這頁本身就是「網站原本的錯誤頁」。
// - 429、503：離線內容＋等待輪播元件；元件失效時退回離線內容。
// - 500、501、502、504：純靜態，不需要 JavaScript，內容在建置時寫入。
// 所有資料一律跳脫後才寫進 HTML（§3 第 1 條）。失蹤人口個案不進離線內容（§3 第 4 條）。
import { isExpired, type Case } from "@doorbell-life/schema";

export const FOUR_XX = [400, 401, 403, 404, 405, 408, 410, 414] as const;
export const WAITING = [429, 503] as const;
export const OFFLINE = [500, 501, 502, 504] as const;
const MISSING = /^missing-/;
const WIDGET = "https://cdn.doorbell.life/widget.js";

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface Pages {
  status: Record<string, string>;
  home: string;
  offline: string;
  hotlines: string;
  stats: string;
  animals: string;
  cachedAt: string;
  by: string;
}

export interface Hotline {
  name: string;
  number: string;
  hours: string;
}

const PAGE_CSS = `body{margin:0;background:var(--bg-base);color:var(--text-primary);font:400 var(--text-base)/1.6 var(--font-sans)}
main{max-width:720px;margin:0 auto;padding:48px 16px}
.code{margin:0;font-size:var(--text-2xl);font-weight:700;color:var(--text-secondary)}
h1{margin:0 0 16px;font-size:var(--text-xl)}
h2{margin:32px 0 8px;font-size:var(--text-lg)}
ul{padding-left:1.2em}
.muted{color:var(--text-secondary);font-size:var(--text-xs)}
.tel{font-weight:700;color:var(--color-link)}
footer{margin-top:48px}`;

function shell(lang: string, title: string, css: string, body: string): string {
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${css}
${PAGE_CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

export function render4xx(status: number, lang: string, p: Pages, css: string): string {
  const msg = p.status[status] ?? "";
  return shell(
    lang,
    `${status} ${msg}`,
    css,
    `<p class="code">${status}</p>
<h1>${esc(msg)}</h1>
<p><a href="/">${esc(p.home)}</a></p>
<script src="${WIDGET}" async data-status="${status}" data-lang="${esc(lang)}"></script>`,
  );
}

// 可以進離線內容的個案：來源允許、未過期、不是失蹤人口。
export function offlineCases(cases: Case[], today: string): Case[] {
  return cases.filter((c) => c.offlineCacheable && !MISSING.test(c.topic) && !isExpired(c, today));
}

export function renderOffline(
  status: number,
  lang: string,
  region: string,
  p: Pages,
  css: string,
  hotlines: Hotline[],
  cases: Case[],
  today: string,
  pickAnimals = 3,
): string {
  const ok = offlineCases(cases, today);
  const stats = ok.filter((c) => c.topic === "stats");
  const animals = ok.filter((c) => c.topic.startsWith("animals-")).slice(0, pickAnimals);
  const msg = p.status[status] ?? "";
  const li = (c: Case) =>
    `<li><strong>${esc(c.title)}</strong><br>${esc(c.features)}${c.contact.name ? `<br>${esc(c.contact.name)} <span class="tel">${esc(c.contact.phone)}</span>` : ""}<br><span class="muted">${esc(c.source.name)}</span></li>`;
  const parts = [
    `<p class="code">${status}</p>`,
    `<h1>${esc(msg)}</h1>`,
    `<p>${esc(p.offline)}</p>`,
    `<h2>${esc(p.hotlines)}</h2>`,
    `<ul>${hotlines.map((h) => `<li>${esc(h.name)} <span class="tel">${esc(h.number)}</span>${h.hours ? ` <span class="muted">${esc(h.hours)}</span>` : ""}</li>`).join("")}</ul>`,
  ];
  if (stats.length) parts.push(`<h2>${esc(p.stats)}</h2>`, `<ul>${stats.map(li).join("")}</ul>`);
  if (animals.length) {
    parts.push(`<h2>${esc(p.animals)}</h2>`, `<p class="muted">${esc(p.cachedAt.replace("#", today))}</p>`, `<ul>${animals.map(li).join("")}</ul>`);
  }
  parts.push(`<footer class="muted"><a href="https://doorbell.life/">${esc(p.by)}</a></footer>`);
  if ((WAITING as readonly number[]).includes(status)) {
    parts.push(`<script src="${WIDGET}" async data-status="${status}" data-region="${esc(region)}" data-lang="${esc(lang)}"></script>`);
  }
  return shell(lang, `${status} ${msg}`, css, parts.join("\n"));
}
