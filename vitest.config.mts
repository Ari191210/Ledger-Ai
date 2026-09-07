import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Two projects rather than one jsdom environment for everything: the pure
    // logic in lib/ is the majority of the suite and has no business paying for
    // a DOM, and running it in node keeps a browser global from being reachable
    // by accident in code that will execute on a server.
    projects: [
      {
        extends: true,
        test: {
          name: "lib",
          environment: "node",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["components/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
  resolve: {
    // match the "@/*" path alias from tsconfig so tests import the same way
    // the app does, rather than through relative paths that drift.
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
