import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { detect } from "../src/detect.ts";
import { insertScript, plan, WIDGET } from "../src/plan.ts";

const tmp = () => mkdtempSync(join(tmpdir(), "dbl-cli-"));
const touch = (p: string, s = "") => {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, s);
};
const opts = (root: string) => ({ lang: "zh-TW", region: "taiwan", templatesDir: "/var/www/doorbell-life", root });
const files = { nginx: "NGINX", apache: "APACHE", update: "UPDATE" };

describe("detect", () => {
  it("Astro 專案放 public/", () => {
    const d = tmp();
    touch(join(d, "astro.config.mjs"));
    expect(detect(d, tmp())).toMatchObject({ kind: "static", publicDir: join(d, "public") });
  });
  it("Netlify 加上平台說明", () => {
    const d = tmp();
    touch(join(d, "netlify.toml"));
    touch(join(d, "index.html"));
    const r = detect(d, tmp());
    expect(r.kind).toBe("static");
    expect(r.notes.join()).toMatch(/Netlify/);
  });
  it("WordPress", () => {
    const d = tmp();
    touch(join(d, "wp-config.php"));
    expect(detect(d, tmp()).kind).toBe("wordpress");
  });
  it("沒有網站檔案時看系統的 nginx、apache", () => {
    const root = tmp();
    touch(join(root, "etc/nginx/nginx.conf"));
    expect(detect(tmp(), root).kind).toBe("nginx");
    const root2 = tmp();
    mkdirSync(join(root2, "etc/apache2"), { recursive: true });
    expect(detect(tmp(), root2).kind).toBe("apache");
    expect(detect(tmp(), tmp()).kind).toBe("unknown");
  });
});

describe("plan", () => {
  it("靜態網站沒有 404.html 時下載範本", () => {
    const d = tmp();
    const a = plan({ kind: "static", label: "", publicDir: d, notes: [] }, opts(tmp()), files);
    expect(a[0]).toEqual({ type: "download", from: "zh-TW/404.html", to: join(d, "404.html") });
  });
  it("已有 404.html 時只插入 script，不覆蓋", () => {
    const d = tmp();
    touch(join(d, "404.html"), "<html><body>mine</body></html>");
    const a = plan({ kind: "static", label: "", publicDir: d, notes: [] }, opts(tmp()), files);
    expect(a[0]).toEqual({ type: "insert-script", to: join(d, "404.html"), status: 404 });
  });
  it("已經裝好就不變更", () => {
    const d = tmp();
    touch(join(d, "404.html"), `<script src="${WIDGET}"></script>`);
    const a = plan({ kind: "static", label: "", publicDir: d, notes: [] }, opts(tmp()), files);
    expect(a.filter((x) => x.type !== "note")).toEqual([]);
  });
  it("nginx：14 個範本、更新腳本、cron、設定片段，最後一步留給使用者", () => {
    const root = tmp();
    const a = plan({ kind: "nginx", label: "", notes: [] }, opts(root), files);
    expect(a.filter((x) => x.type === "download")).toHaveLength(14);
    expect(a).toContainEqual({ type: "write", to: join(root, "etc/nginx/snippets/doorbell-life.conf"), content: "NGINX" });
    expect(a[a.length - 1]).toMatchObject({ type: "note" });
  });
});

describe("insertScript", () => {
  it("插在 </body> 前", () => {
    expect(insertScript("<body>x</body>", 404)).toBe(`<body>x<script src="${WIDGET}" async data-status="404"></script>\n</body>`);
  });
});

describe("實際執行打包後的 CLI", () => {
  const cliDir = new URL("../", import.meta.url);
  const cli = new URL("../dist/cli.js", import.meta.url).pathname;
  let base: string;
  beforeAll(() => {
    execFileSync("node", ["scripts/build.mjs"], { cwd: cliDir });
    base = tmp();
    for (const p of ["zh-TW/404.html", "zh-TW/400.html", "zh-TW/401.html", "zh-TW/403.html", "zh-TW/405.html", "zh-TW/408.html", "zh-TW/410.html", "zh-TW/414.html", ...[429, 500, 501, 502, 503, 504].map((s) => `taiwan/${s}.html`)]) {
      touch(join(base, p), `TEMPLATE ${p}`);
    }
  });
  const run = (args: string[], root: string, input = "") =>
    execFileSync("node", [cli, ...args], { env: { ...process.env, DOORBELL_BASE: pathToFileURL(base).href, DOORBELL_ROOT: root }, input, encoding: "utf8" });

  it("靜態網站：--yes 直接寫入 404.html", () => {
    const d = tmp();
    touch(join(d, "astro.config.mjs"));
    run(["install", d, "--yes"], tmp());
    expect(readFileSync(join(d, "public/404.html"), "utf8")).toBe("TEMPLATE zh-TW/404.html");
  });
  it("回答 n 就不寫入任何檔案", () => {
    const d = tmp();
    touch(join(d, "index.html"));
    const out = run(["install", d], tmp(), "n\n");
    expect(out).toContain("已取消");
    expect(existsSync(join(d, "404.html"))).toBe(false);
  });
  it("nginx：寫入範本、設定片段、可執行的更新腳本", () => {
    const root = tmp();
    touch(join(root, "etc/nginx/nginx.conf"));
    run(["install", tmp(), "--yes"], root);
    expect(readFileSync(join(root, "var/www/doorbell-life/503.html"), "utf8")).toBe("TEMPLATE taiwan/503.html");
    expect(readFileSync(join(root, "etc/nginx/snippets/doorbell-life.conf"), "utf8")).toContain("error_page 404");
    expect(statSync(join(root, "opt/doorbell-life/update-templates.sh")).mode & 0o111).toBeTruthy();
  });
});
