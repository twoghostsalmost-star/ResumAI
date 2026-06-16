# ResumeForge — Architecture

ResumeForge is a multi-surface resume builder. One backend serves three clients
that share a single canonical data model.

```
                       ┌──────────────────────────────┐
                       │  packages/shared (@resumeforge/shared)  │
                       │  zod schemas + TS types:       │
                       │  Resume · ResumePatch · ATS    │
                       └──────────────┬───────────────┘
                                      │ (consumed by web, api, mobile)
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                              │
┌───────▼────────┐          ┌─────────▼─────────┐          ┌────────▼─────────┐
│ apps/web        │          │ apps/api          │          │ apps/mobile       │
│ Next.js (Vercel)│  HTTPS   │ Fastify + Prisma  │  HTTPS   │ Expo / RN (iOS)   │
│ React DOM       │ ───────► │ Postgres · Redis  │ ◄─────── │ Skia preview      │
└─────────────────┘          │ Playwright PDF    │          └───────────────────┘
                             │ Anthropic · STT/TTS│
┌─────────────────┐  HTTPS   │ LinkedIn OIDC      │
│ apps/ios         │ ───────► │                    │
│ SwiftUI (iOS 26) │          └────────────────────┘
│ Liquid Glass     │
└─────────────────┘
```

## Core principle (spec §3): thin shell, intelligence on the backend
- **UI, navigation, live preview** run on-device / in-browser for responsiveness.
- **Everything else** — file parsing, LLM calls, STT/TTS, ATS scoring, PDF/DOCX
  export, LinkedIn token exchange — runs on the backend so provider keys never
  ship to a client and output is consistent across all three surfaces.
- The in-app **preview** is rendered client-side (Skia on iOS RN, SwiftUI on
  native iOS, HTML/CSS on web). The **exported file** is always rendered
  server-side from semantic HTML → tagged PDF so it keeps selectable text for
  ATS parsing. Rasterized/canvas PDFs are never used for export.

## Surfaces

| Surface | Path | Stack | Deploy |
|---|---|---|---|
| Web app | `apps/web` | Next.js 14 App Router, React Query, zustand | Vercel (root dir `apps/web`) |
| Backend API | `apps/api` | Fastify, Prisma, Postgres, Redis, Playwright | Container (Dockerfile) → Fly/Render/AWS |
| iOS (native) | `apps/ios` | SwiftUI, iOS 26 Liquid Glass, XcodeGen | Xcode 26 → TestFlight |
| iOS (RN) | `apps/mobile` | Expo, expo-router, Skia | EAS Build → TestFlight |
| Shared model | `packages/shared` | zod + TypeScript | npm workspace |

## Data model
The single source of truth is `Resume` in `packages/shared`. The web and RN
clients import the types directly; the iOS app mirrors them as `Codable`
structs. Mutations from the assistant and ATS auto-fixes are expressed as
`ResumePatch[]` and applied immutably (`applyPatches`) — never silently; the
user always confirms.

## Request surface (backend)
Auth is a passwordless bearer token (`POST /auth/session`). All resume routes
resolve the acting user from the token, falling back to an anonymous demo
identity so the app is runnable without configuring auth.

- Resumes: `GET/POST /resumes`, `GET/PUT/DELETE /resumes/:id`, `POST /resumes/:id/patch`
- ATS: `POST /resumes/:id/score`, `POST /ats/score`
- Assistant: `POST /resumes/:id/assistant`
- Import: `POST /parse/text`, `POST /parse/upload`
- Export: `GET /resumes/:id/export?format=pdf|docx|html`
- Share: `POST /resumes/:id/share`, `GET /share/:token`
- Voice: `POST /voice/stt`, `POST /voice/tts`
- LinkedIn: `GET /linkedin/auth-url`, `GET /linkedin/callback`
- Account/privacy: `GET /me`, `GET /me/export`, `DELETE /me`

## Graceful degradation
Every external dependency degrades instead of crashing:
- No `ANTHROPIC_API_KEY` → parsing uses the deterministic heuristic parser; the
  assistant route returns the model error as a normal reply.
- No STT/TTS key → voice endpoints return `502` with a clear reason; manual
  editing is unaffected.
- No LinkedIn credentials → `/linkedin/auth-url` returns `501` and the clients
  show the "Save to PDF → import" fallback.
- `@fastify/multipart` / `pdf-parse` / `mammoth` absent → `/parse/upload` falls
  back to `/parse/text` and raw text decoding.
