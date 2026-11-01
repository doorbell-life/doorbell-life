// 打包成單一 JS 檔（npm 套件裡的 .ts 無法直接執行），並把設定範例內嵌進去。
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/cli.js",
  banner: { js: "#!/usr/bin/env node" },
  loader: { ".conf": "text", ".sh": "text" },
  logLevel: "warning",
});
