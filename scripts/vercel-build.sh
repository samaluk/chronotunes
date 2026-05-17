#!/usr/bin/env bash
# Vercel + Convex: same flow as flip7 (`pnpm exec convex deploy --cmd 'pnpm build'`),
# but production deploy keys must not run `convex deploy` on preview/development
# builds (Convex CLI rejects that). Scope prod CONVEX_DEPLOY_KEY to Production only
# in Vercel, or use a preview deploy key for Preview — this script is a safety net.
set -euo pipefail

if [[ "${VERCEL:-}" == "1" && "${VERCEL_ENV:-}" != "production" ]]; then
  case "${CONVEX_DEPLOY_KEY:-}" in
    prod:*)
      echo "Skipping convex deploy on Vercel preview: production deploy key is present."
      echo "Deploy Convex from preview with a preview deploy key, or scope prod CONVEX_DEPLOY_KEY to Production only."
      exec pnpm run build
      ;;
  esac
fi

if [[ -n "${CONVEX_DEPLOY_KEY:-}" ]]; then
  exec pnpm exec convex deploy --cmd 'pnpm build'
fi

echo "No CONVEX_DEPLOY_KEY set; building Next.js without pushing Convex."
exec pnpm run build
