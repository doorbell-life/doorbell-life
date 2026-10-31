// 打包 widget.js 與 w.css，並檢查 widget.js gzip 後不超過上限（CLAUDE.md §13）。
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const LIMIT = 1024;

await build({
  entryPoints: ["src/widget.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  outfile: "dist/widget.js",
  logLevel: "warning",
});
await build({
  entryPoints: ["src/w.css"],
  minify: true,
  outfile: "dist/w.css",
  logLevel: "warning",
});

for (const f of ["dist/widget.js", "dist/w.css"]) {
  const buf = readFileSync(f);
  console.log(`${f} raw=${buf.length} gzip=${gzipSync(buf, { level: 9 }).length}`);
}
const size = gzipSync(readFileSync("dist/widget.js"), { level: 9 }).length;
if (size > LIMIT) {
  console.error(`widget.js gzip ${size} bytes 超過上限 ${LIMIT} bytes`);
  process.exit(1);
}
