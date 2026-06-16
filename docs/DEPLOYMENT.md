# ResumeForge — Deployment

## 1. Backend API (`apps/api`)
The API needs Postgres (and optionally Redis for queues). Deploy as a container.

```bash
# Build the image (includes Chromium for PDF export)
docker build -f docker/Dockerfile.api -t resumeforge-api .
docker run -p 3000:3000 --env-file .env resumeforge-api
```

Required env (see `.env.example`): `DATABASE_URL`, `JWT_SIGNING_SECRET`,
`PUBLIC_BASE_URL`. Optional: `ANTHROPIC_API_KEY`, `STT_*`, `TTS_*`,
`LINKEDIN_*`, `REDIS_URL`, S3 vars.

Run migrations once against your database:
```bash
pnpm db:generate && pnpm db:migrate
```

Recommended hosts: Fly.io, Render, Railway, or AWS ECS. Vercel is **not** ideal
for this service because PDF export launches headless Chromium (Playwright),
which exceeds typical serverless limits — run the API as a long-lived container.

## 2. Web app (`apps/web`) → Vercel preview
The Next.js app is built for Vercel preview deployments.

**Vercel project settings:**
- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js
- **Install Command:** `pnpm install` (monorepo-aware; pnpm workspaces)
- **Build Command:** `pnpm build` (Next.js) — Vercel runs it inside `apps/web`
- **Environment variable:** `NEXT_PUBLIC_API_BASE_URL=https://<your-api-host>`

Every push produces a Vercel **Preview Deployment** with its own URL. Point
`NEXT_PUBLIC_API_BASE_URL` at a deployed API (or a tunneled local API) so the
preview is fully functional.

Local:
```bash
pnpm install
pnpm build:shared
pnpm dev:api      # terminal 1 — http://localhost:3000
pnpm dev:web      # terminal 2 — http://localhost:3001
```

## 3. iOS native app (`apps/ios`) → TestFlight
Requires Xcode 26+ (iOS 26 SDK) for the Liquid Glass APIs.

```bash
brew install xcodegen
cd apps/ios
xcodegen generate
open ResumeForge.xcodeproj
```

Set the API base URL in **Settings** inside the app (persisted), or edit the
`API_BASE_URL` Info.plist value. Select an iOS 26 simulator and run. Archive →
distribute to TestFlight as usual.

## 4. iOS RN app (`apps/mobile`) → TestFlight (EAS)
```bash
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL
pnpm install
pnpm dev:mobile        # press i for the iOS simulator
# Production build:
npx eas build --platform ios
```
Add `Helvetica.ttf` / `Helvetica-Bold.ttf` under `apps/mobile/assets/` for the
Skia preview (see that folder's README).

## Infra for local dev
```bash
pnpm infra:up   # Postgres + Redis + MinIO via docker/docker-compose.yml
```
