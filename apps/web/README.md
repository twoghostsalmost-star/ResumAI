# @resumeforge/web

The web frontend for **ResumeForge** — a Next.js 14 (App Router) app that talks to
the Fastify backend. Build, import, score, and export ATS-ready resumes from the
browser, with full feature parity with the mobile app.

## Stack

- **Next.js 14** (App Router, React 18, TypeScript strict)
- **@tanstack/react-query** for server state
- **zustand** for the active-resume editor store
- **@resumeforge/shared** (workspace) for zod schemas + types
- Plain global CSS with CSS variables and a frosted-glass aesthetic (`backdrop-filter`).
  No Tailwind, no UI kit — minimal deps for reliable Vercel builds.

## Routes

| Route            | Purpose                                                            |
| ---------------- | ----------------------------------------------------------------- |
| `/`              | Landing + passwordless email sign-in (auto-redirects if signed in)|
| `/dashboard`     | List / delete resumes, create new                                 |
| `/new`           | Choose: scratch · upload · LinkedIn                               |
| `/import`        | Paste text or upload a file → review parsed fields → create       |
| `/resume/[id]`   | Editor with **Preview / Content / Assistant / ATS** tabs          |
| `/settings`      | Account info, data export, delete account                         |

The editor tab is reflected in the URL (`?tab=content`) so it stays stable on refresh.

## Local development

From the monorepo root (this app is a pnpm workspace package):

```bash
# Build the shared package first (provides dist/ types)
pnpm --filter @resumeforge/shared build

# Run the API (separate service) on :3000, then:
pnpm --filter @resumeforge/web dev   # http://localhost:3001
```

### Environment

Copy `.env.example` to `.env.local` and adjust if your API isn't on the default:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### Type check

```bash
pnpm --filter @resumeforge/web lint   # tsc --noEmit
```

## Deploying to Vercel

1. Import the repository into Vercel.
2. **Root Directory:** `apps/web`.
3. **Framework Preset:** Next.js (auto-detected; `vercel.json` is included).
4. **Build Command:** `next build` (default). Vercel runs `pnpm install` at the
   repo root, so the `@resumeforge/shared` workspace package resolves correctly.
   If you build the shared package's `dist/` in CI, add
   `pnpm --filter @resumeforge/shared build && next build` as the build command.
   (`transpilePackages: ['@resumeforge/shared']` lets Next compile it from source.)
5. **Environment Variable:** `NEXT_PUBLIC_API_BASE_URL` → your deployed API URL.

## Notes / assumptions

- Auth is a passwordless email session; the returned bearer token is stored in
  `localStorage` and injected on every API request.
- The resume **Preview** mirrors the server's export HTML (single-column,
  ATS-safe) using the `design` settings (template, font, accent, scale, margins).
- The **Content** tab autosaves (debounced ~1.2s) via `PUT /resumes/:id`, with a
  manual "Save now" button.
- Assistant patches are **never auto-applied** — the user taps "Apply N change(s)".
- ATS auto-fixes apply the finding's `autoApplyPatch`, then re-score.
