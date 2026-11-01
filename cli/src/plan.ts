// 依偵測結果列出變更。這裡只產生計畫，實際寫入在 apply()，而且要使用者確認。
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Detection } from "./detect.ts";

export const FOUR_XX = [400, 401, 403, 404, 405, 408, 410, 414];
export const REGION_CODES = [429, 500, 501, 502, 503, 504];
export const WIDGET = "https://cdn.doorbell.life/widget.js";

export type Action =
  | { type: "download"; from: string; to: string } // from 是範本相對路徑，例如 zh-TW/404.html
  | { type: "write"; to: string; content: string; mode?: number }
  | { type: "insert-script"; to: string; status: number }
  | { type: "note"; text: string };

export interface Options {
  lang: string;
  region: string;
  templatesDir: string; // 伺服器：範本存放處
  root: string; // 系統根目錄（測試用）
}

export function scriptTag(status: number, lang?: string): string {
  return `<script src="${WIDGET}" async data-status="${status}"${lang ? ` data-lang="${lang}"` : ""}></script>`;
}

export function plan(d: Detection, o: Options, files: { nginx: string; apache: string; update: string }): Action[] {
  const a: Action[] = [];
  if (d.kind === "static" && d.publicDir) {
    const target = join(d.publicDir, "404.html");
    if (existsSync(target)) {
      if (!readFileSync(target, "utf8").includes(WIDGET)) a.push({ type: "insert-script", to: target, status: 404 });
      else a.push({ type: "note", text: `${target} 已經裝好，不用變更。` });
    } else {
      a.push({ type: "download", from: `${o.lang}/404.html`, to: target });
    }
    a.push({ type: "note", text: "靜態代管平台無法自訂 5xx，這是平台限制。" });
  } else if (d.kind === "nginx" || d.kind === "apache") {
    const dir = join(o.root, o.templatesDir);
    for (const s of FOUR_XX) a.push({ type: "download", from: `${o.lang}/${s}.html`, to: join(dir, `${s}.html`) });
    for (const s of REGION_CODES) a.push({ type: "download", from: `${o.region}/${s}.html`, to: join(dir, `${s}.html`) });
    a.push({ type: "write", to: join(o.root, "opt/doorbell-life/update-templates.sh"), content: files.update, mode: 0o755 });
    a.push({
      type: "write",
      to: join(o.root, "etc/cron.d/doorbell-life"),
      content: `# doorbell.life：每天更新錯誤頁範本\n15 4 * * * root sh /opt/doorbell-life/update-templates.sh ${o.templatesDir} ${o.lang} ${o.region}\n`,
    });
    if (d.kind === "nginx") {
      a.push({ type: "write", to: join(o.root, "etc/nginx/snippets/doorbell-life.conf"), content: files.nginx });
      a.push({ type: "note", text: "最後一步請自己做：在網站的 server { } 裡加上 include snippets/doorbell-life.conf; 再執行 nginx -t && nginx -s reload。" });
    } else {
      const confDir = existsSync(join(o.root, "etc/apache2")) ? "etc/apache2/conf-available" : "etc/httpd/conf.d";
      a.push({ type: "write", to: join(o.root, confDir, "doorbell-life.conf"), content: files.apache });
      a.push({
        type: "note",
        text:
          confDir === "etc/apache2/conf-available"
            ? "最後一步請自己做：a2enconf doorbell-life && apachectl configtest && systemctl reload apache2。"
            : "最後一步請自己做：apachectl configtest && systemctl reload httpd。",
      });
    }
  } else if (d.kind === "wordpress") {
    a.push({ type: "note", text: "請到 WordPress 後台安裝 doorbell.life 外掛。" });
  } else {
    a.push({ type: "note", text: `無法判斷架構。若網站已有錯誤頁，在錯誤頁的 </body> 前加上：\n  ${scriptTag(404)}\n（data-status 改成該頁的狀態碼）` });
  }
  return a;
}

export function insertScript(html: string, status: number): string {
  const tag = scriptTag(status);
  const i = html.toLowerCase().lastIndexOf("</body>");
  return i === -1 ? html + "\n" + tag + "\n" : html.slice(0, i) + tag + "\n" + html.slice(i);
}
