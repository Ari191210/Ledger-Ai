import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    // match the "@/*" path alias from tsconfig so tests import the same way
    // the app does, rather than through relative paths that drift.
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
