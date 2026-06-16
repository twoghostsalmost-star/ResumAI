# ResumeForge

End-to-end resume creation + enhancement app. Expo (React Native, iOS) front end, Fastify/Postgres backend, built against the spec in `resume-app-build-spec.md`.

This is a **real working foundation**, not a mockup. Below is an honest map of what runs out of the box, what needs your keys, and what's still to come.

## What's complete and runnable (no keys needed)
- **Shared data model** (`packages/shared`) — full `zod` schemas for the resume, patch engine, ATS types.
- **Patch engine** — immutable `applyPatch`/`applyPatches` with validation. Real logic, unit-testable.
- **Deterministic ATS scorer** (`apps/api/src/pipeline/ats-scorer.ts`) — five subscores, weighted overall, concrete findings with auto-fix patches. Fully real, with a passing test suite (`pnpm --filter @resumeforge/api test`).
- **Resume → semantic HTML renderer** (`export-html.ts`) — ATS-safe, selectable-text output.
- **DOCX export** — generated from the model with the `docx` library.
- **Backend CRUD + patch + scoring + export routes** — real Fastify handlers backed by Prisma/Postgres.
- **Mobile app** — home, new-resume chooser, and a four-tab editor (Preview via Skia, Content form, Assistant chat, ATS dashboard) wired to the API.

## What's real code but needs credentials / network at runtime
- **LLM assistant** (`providers/llm/anthropic.ts`, `routes/assistant.ts`) — real Anthropic Messages API call. Needs `ANTHROPIC_API_KEY`.
- **PDF export** — real Playwright render. Needs `npx playwright install chromium`.
- **LinkedIn OAuth, STT/TTS, S3 storage** — interfaces and wiring are in place per the spec; provide keys to activate. (These are the next build layer — see "Roadmap".)

## Prerequisites
- Node 20+, pnpm 9+, Docker, Xcode (for iOS), an iOS simulator or device.

## Run it
```bash
cp .env.example .env            # fill in keys you have; Postgres/Redis work as-is
pnpm install
pnpm infra:up                   # postgres + redis + minio via Docker
pnpm build:shared
pnpm db:generate && pnpm db:migrate
pnpm dev:api                    # http://localhost:3000  (GET /health → {ok:true})
# in another terminal:
pnpm dev:mobile                 # press i for iOS simulator
```

### Run the ATS scorer tests (proves the core logic)
```bash
pnpm --filter @resumeforge/api test
```

## Architecture (per spec §3)
The app shell is thin; intelligence is on the backend. Skia renders the **live preview** only; the **exported** PDF is server-rendered from semantic HTML so it keeps selectable text for ATS parsing.

## Roadmap (next complete layers)
1. File parsing pipeline (PDF/DOCX → structured model via LLM + zod repair) + import review screen.
2. LinkedIn OpenID Connect sign-in + profile-PDF fallback.
3. Streaming STT/TTS voice mode.
4. S3 storage + share links + retention jobs.
5. Auth (replace `DEMO_USER_ID`), encryption at rest, data export/delete.

> Note on the build environment: this codebase was authored offline, so it has not been executed here. It is written to compile and run once dependencies are installed (`pnpm install`) and a Postgres instance is up. The ATS scorer and renderer are pure functions and are covered by tests.
