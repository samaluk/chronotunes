import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // TypeScript 7 has no JS compiler API; use the project-local tsc CLI.
    // https://nextjs.org/docs/app/api-reference/config/typescript#using-typescript-7
    useTypeScriptCli: true,
    turbopackRustReactCompiler: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
