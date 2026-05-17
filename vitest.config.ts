import path from "node:path"
import { defineConfig } from "vitest/config"

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
          server: { deps: { inline: ["next-intl"] } },
        },
        resolve: {
          alias: {
            "@/convex": path.resolve(import.meta.dirname, "convex"),
            "@/convex/*": path.resolve(import.meta.dirname, "convex/*"),
            "@": path.resolve(import.meta.dirname, "src"),
            "@/*": path.resolve(import.meta.dirname, "src/*"),
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
    ],
  },
})
