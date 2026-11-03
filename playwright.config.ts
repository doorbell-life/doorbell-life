import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: "**/*.e2e.ts",
  testIgnore: ".claude/**",
  use: { browserName: "chromium" },
  // 官網測試用：先 pnpm build，再以 astro preview 提供 site/dist
  webServer: {
    command: "pnpm --filter @doorbell-life/site exec astro preview --port 4329",
    url: "http://localhost:4329/",
    reuseExistingServer: true,
  },
});
