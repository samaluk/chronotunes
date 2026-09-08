import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  experimental: {
    useOffline: true,
    exposeTestingApiInProductionBuild: process.env.PLAYWRIGHT === "1",
    // TypeScript 7 has no JS compiler API; use the project-local tsc CLI.
    // https://nextjs.org/docs/app/api-reference/config/typescript#using-typescript-7
    useTypeScriptCli: true,
    turbopackRustReactCompiler: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
