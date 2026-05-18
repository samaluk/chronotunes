import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // Project for React component tests (jsdom environment)
      {
        extends: true,
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "src"),
            "@/*": path.resolve(import.meta.dirname, "src/*"),
            "@/convex": path.resolve(import.meta.dirname, "convex"),
            "@/convex/*": path.resolve(import.meta.dirname, "convex/*"),
          },
        },
        test: {
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
          name: "react",
          server: { deps: { inline: ["next-intl"] } },
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      // Project for Convex function tests (edge-runtime environment)
      {
        extends: true,
        test: {
          environment: "edge-runtime",
          include: ["convex/**/*.test.ts"],
          name: "convex",
          server: { deps: { inline: ["convex-test"] } },
        },
      },
    ],
  },
});
