# ResumeForge

End-to-end resume creation + enhancement platform with an **ATS-aware AI
assistant**. One backend, three clients that share a single canonical data model:

| Surface | Path | Stack |
|---|---|---|
| **Web app** | `apps/web` | Next.js 14 (App Router), React Query, zustand — Vercel-deployable |
| **iOS (native)** | `apps/ios` | SwiftUI, iOS 26 **Liquid Glass**, XcodeGen |
| **iOS (React Native)** | `apps/mobile` | Expo, expo-router, Skia preview |
| **Backend API** | `apps/api` | Fastify, Prisma, Postgres, Redis, Playwright |
| **Shared model** | `packages/shared` | zod schemas + TypeScript types |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full picture, and
[`docs/build-spec.md`](docs/build-spec.md) for the original product spec.

## What it does
- **Create from scratch** or **enhance an existing resume** (paste/upload → parse).
- **Conversational AI assistant** proposes edits as explicit `ResumePatch` diffs
  you accept or reject — nothing mutates silently.
- **ATS scoring** — deterministic + LLM hybrid, five subscores, ranked findings
  with one-tap auto-fixes.
- **ATS-safe export** — server-rendered semantic HTML → tagged PDF (real
  selectable text), plus DOCX and tokenized share links.
- **Privacy controls** — export-my-data and hard account deletion.

## Architecture principle (spec §3): thin shell, intelligence on the backend
UI, navigation, and the live preview run on the client. Parsing, LLM calls,
STT/TTS, ATS scoring, PDF/DOCX export, and LinkedIn token exchange run on the
backend so provider keys never ship to a client and output is identical across
all three surfaces. The in-app preview is client-rendered; the **exported** file
is always server-rendered from semantic HTML so it stays ATS-parseable.

## Quick start (web + API)
```bash
cp .env.example .env          # Postgres/Redis work as-is; add AI keys if you have them
pnpm install
pnpm infra:up                 # Postgres + Redis + MinIO via Docker
pnpm build:shared
pnpm db:generate && pnpm db:migrate
pnpm dev:api                  # http://localhost:3000  (GET /health → {ok:true})
pnpm dev:web                  # http://localhost:3001
```

Run the other clients:
```bash
pnpm dev:mobile               # Expo — press i for the iOS simulator
cd apps/ios && xcodegen generate && open ResumeForge.xcodeproj   # native iOS (Xcode 26+)
```

## Verify it
```bash
pnpm build:shared && pnpm build:api && pnpm --filter @resumeforge/web lint
pnpm test                     # ATS scorer + parser/export unit tests (9 passing)
pnpm --filter @resumeforge/web build   # production Next.js build (Vercel parity)
```

## What's real vs. what needs credentials
**Runs with no keys:** shared model + patch engine, deterministic ATS scorer,
heuristic resume parser, semantic-HTML/DOCX export, all CRUD/score/patch/share
routes, and every client UI.

**Needs credentials at runtime (degrades gracefully without):**
- `ANTHROPIC_API_KEY` → richer LLM parsing + assistant (heuristic fallback otherwise).
- PDF export → `npx playwright install chromium`.
- `STT_*` / `TTS_*` → voice mode. `LINKEDIN_*` → OAuth (PDF-import fallback otherwise).

## Deploying

**Low-touch (one click each, env vars collected during import):** see
[`DEPLOY.md`](DEPLOY.md). Deploy the **API first**, then the web app.

[![Deploy API](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI&root-directory=apps%2Fapi&project-name=resumai-api&repository-name=resumai-api&env=DATABASE_URL,JWT_SIGNING_SECRET,WEB_BASE_URL,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,APPLE_CLIENT_ID,APPLE_TEAM_ID,APPLE_KEY_ID,APPLE_PRIVATE_KEY&envDescription=Neon%20DATABASE_URL%20%2B%20JWT%20%2B%20auth%20secrets&envLink=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI%2Fblob%2Fmain%2FDEPLOY_API_VERCEL.md&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%7D%5D)
&nbsp;
[![Deploy Web](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI&root-directory=apps%2Fweb&project-name=resumai-web&repository-name=resumai-web&env=NEXT_PUBLIC_API_BASE_URL&envDescription=The%20deployed%20ResumAI%20API%20URL&envLink=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI%2Fblob%2Fmain%2FDEPLOY.md)

Manual / other targets:
- **Web → Vercel:** Root Directory `apps/web`, set `NEXT_PUBLIC_API_BASE_URL`.
- **API → Vercel + Neon:** [`DEPLOY_API_VERCEL.md`](DEPLOY_API_VERCEL.md).
- **API → container:** `docker/Dockerfile.api` (bundles Chromium for PDF).
- **iOS → TestFlight** (Xcode 26) / **RN → EAS Build**.

Full instructions in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
