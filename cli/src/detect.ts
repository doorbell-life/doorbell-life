// 偵測網站架構。只讀檔案，不寫入。
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Kind = "static" | "wordpress" | "nginx" | "apache" | "unknown";

export interface Detection {
  kind: Kind;
  label: string; // 給人看的說明，例如「Astro（public/）」
  publicDir?: string; // static：404.html 要放的資料夾
  notes: string[];
}

const has = (dir: string, ...names: string[]) => names.some((n) => existsSync(join(dir, n)));
const hasPrefix = (dir: string, prefix: string) => {
  try {
    return readdirSync(dir).some((f) => f.startsWith(prefix));
  } catch {
    return false;
  }
};

// root 參數讓測試可以指定假的系統根目錄。
export function detect(dir: string, root = "/"): Detection {
  if (has(dir, "wp-config.php")) {
    return { kind: "wordpress", label: "WordPress", notes: ["建議改用 doorbell.life WordPress 外掛，從後台設定即可。"] };
  }
  const notes: string[] = [];
  if (has(dir, "netlify.toml")) notes.push("偵測到 Netlify：根目錄的 404.html 會自動用於找不到的頁面；Netlify 無法自訂 5xx。");
  if (has(dir, "vercel.json")) notes.push("偵測到 Vercel：輸出目錄的 404.html 會用於找不到的頁面；Vercel 無法自訂 5xx。");
  if (has(dir, "wrangler.toml", "wrangler.json", "wrangler.jsonc")) {
    notes.push('偵測到 Cloudflare Workers：靜態資源請把 assets.not_found_handling 設成 "404-page"。');
  }

  const frameworks: [string, string, string][] = [
    ["astro.config.", "Astro", "public"],
    ["vite.config.", "Vite", "public"],
    ["svelte.config.", "SvelteKit", "static"],
    ["nuxt.config.", "Nuxt", "public"],
    ["gatsby-config.", "Gatsby", "static"],
  ];
  for (const [prefix, name, pub] of frameworks) {
    if (hasPrefix(dir, prefix)) return { kind: "static", label: `${name}（${pub}/）`, publicDir: join(dir, pub), notes };
  }
  if (has(dir, "hugo.toml", "hugo.yaml", "hugo.json")) return { kind: "static", label: "Hugo（static/）", publicDir: join(dir, "static"), notes };
  if (has(dir, "_config.yml")) return { kind: "static", label: "Jekyll／GitHub Pages（根目錄）", publicDir: dir, notes };
  if (has(dir, "index.html")) return { kind: "static", label: "靜態網站（根目錄）", publicDir: dir, notes };

  if (existsSync(join(root, "etc/nginx/nginx.conf"))) return { kind: "nginx", label: "Nginx", notes };
  if (existsSync(join(root, "etc/apache2")) || existsSync(join(root, "etc/httpd"))) return { kind: "apache", label: "Apache", notes };
  return { kind: "unknown", label: "無法判斷", notes };
}
