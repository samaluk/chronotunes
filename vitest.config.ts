import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // Project for React component tests (jsdom environment)
      {
        extends: true,
        test: {
          name: "react",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
        resolve: {
          alias: {
            "@/convex": path.resolve(__dirname, "convex"),
            "@/convex/*": path.resolve(__dirname, "convex/*"),
            "@": path.resolve(__dirname, "src"),
            "@/*": path.resolve(__dirname, "src/*"),
          },
        },
      },
      // Project for Convex function tests (edge-runtime environment)
      {
        extends: true,
        test: {
          name: "convex",
          environment: "edge-runtime",
          server: { deps: { inline: ["convex-test"] } },
          include: ["convex/**/*.test.ts"],
        },
      },
    ]
  },
});
