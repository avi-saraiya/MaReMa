import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Separate SQLite file so unit tests never touch dev data (path is relative to prisma/).
    env: { DATABASE_URL: "file:./test.db" },
    globalSetup: ["tests/unit/global-setup.ts"],
    fileParallelism: false,
  },
});
