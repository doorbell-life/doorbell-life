import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // .claude/worktrees 是平行工作的 git worktree，不屬於這份程式碼
  test: { include: ["**/*.test.ts"], exclude: [...configDefaults.exclude, ".claude/**"] },
});
