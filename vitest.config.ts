import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // Project for React component tests (jsdom environment)
      {
        extends: true,
        resolve: {
          alias: [
            {
              // oxlint-disable-next-line eslint/prefer-named-capture-group -- ES2017 target disallows named groups in tsc
              find: /^@\/convex\/(.*)$/u,
              replacement: path.resolve(import.meta.dirname, "convex/$1"),
            },
            {
              // oxlint-disable-next-line eslint/prefer-named-capture-group -- ES2017 target disallows named groups in tsc
              find: /^@\/(.*)$/u,
              replacement: path.resolve(import.meta.dirname, "src/$1"),
            },
          ],
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
