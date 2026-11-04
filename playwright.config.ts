import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: "**/*.e2e.ts",
  // 只略過這份 repo 底下的 .claude/（平行工作的 worktree）。用絕對路徑比對，
  // 否則在 worktree 裡執行時，自己的路徑也含 .claude/，會把所有測試都略過。
  testIgnore: new RegExp("^" + import.meta.dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/\\.claude/"),
  use: { browserName: "chromium" },
  // 官網測試用：先 pnpm build，再以 astro preview 提供 site/dist
  webServer: {
    command: "pnpm --filter @doorbell-life/site exec astro preview --port 4329",
    url: "http://localhost:4329/",
    reuseExistingServer: true,
  },
});
