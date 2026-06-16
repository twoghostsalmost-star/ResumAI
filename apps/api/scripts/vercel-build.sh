#!/usr/bin/env bash
#
# Vercel build for the API. Lives in a script because vercel.json's inline
# `buildCommand` is capped at 256 chars and this chain is longer.
#
# Vercel runs this from the project Root Directory (apps/api), so step one is
# to hop up to the monorepo root where pnpm/workspaces live.
set -euo pipefail

cd "$(dirname "$0")/../../.."   # apps/api/scripts -> repo root

pnpm build:shared
pnpm --filter @resumeforge/api exec prisma generate
pnpm --filter @resumeforge/api build

# Push the schema using a direct (unpooled) connection. The Neon Vercel
# integration injects POSTGRES_URL_NON_POOLING / DATABASE_URL_UNPOOLED; fall
# back to DATABASE_URL when the URL is set manually.
DATABASE_URL="${POSTGRES_URL_NON_POOLING:-${DATABASE_URL_UNPOOLED:-${DATABASE_URL:-}}}" \
  pnpm --filter @resumeforge/api exec prisma db push --skip-generate --accept-data-loss
