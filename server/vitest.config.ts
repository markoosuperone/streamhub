import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["src/tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    fileParallelism: false,
  },
});
