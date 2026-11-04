import { defineConfig } from "@playwright/test";

// 排除本 repo 底下 .claude/ 內的平行 worktree；比對絕對路徑，所以要以設定檔所在目錄為基準，
// 否則在 worktree 裡執行時（路徑本身就含 .claude/）會把全部測試都排除。
const here = import.meta.dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default defineConfig({
  testMatch: "**/*.e2e.ts",
  testIgnore: new RegExp(`^${here}/\\.claude/`),
  use: { browserName: "chromium" },
  // 官網測試用：先 pnpm build，再以 astro preview 提供 site/dist
  webServer: {
    command: "pnpm --filter @doorbell-life/site exec astro preview --port 4329",
    url: "http://localhost:4329/",
    reuseExistingServer: true,
  },
});
