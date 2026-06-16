# Deploy the ResumeForge API on Vercel (no Render needed)

You can run the whole stack on Vercel: the web app as one project, the API as a
second project (Serverless Functions), and a **free Neon Postgres** database
added through the Vercel Marketplace connector. This guide wires that up.

> Validated locally: the Vercel function bridge (`apps/api/api/index.mjs` →
> Fastify) returns `200` on `/health`, and the API builds clean. The one caveat
> is PDF export — see [PDF on serverless](#pdf-export-on-serverless) below.

---

## Overview

```
Vercel project "resumeforge-web"  (apps/web)   ──► NEXT_PUBLIC_API_BASE_URL ──┐
Vercel project "resumeforge-api"  (apps/api)   ◄──────────────────────────────┘
        └── Neon Postgres (Vercel Marketplace connector, free)
```

The API ships:
- `apps/api/api/index.mjs` — Vercel function that wraps the Fastify app.
- `apps/api/vercel.json` — install/build commands + routes everything to the
  function. The build also runs `prisma db push` to create tables.

---

## Step 1 — Create the database (Neon, free)

1. In your Vercel dashboard, open the **Storage** tab → **Create Database** →
   **Neon** (Serverless Postgres). Pick the **Free** plan and a region near you.
   (Supabase from the Marketplace works too; Neon is the simplest.)
2. After it's created, open the database → **Connection Details** and copy the
   **direct / unpooled** connection string — the host **without** `-pooler` in
   it, e.g. `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`.
   Keep this handy for Step 3.

   > Use the **direct** string for `DATABASE_URL`. Prisma's `db push` (run at
   > build time) needs a direct connection — it can fail over Neon's pooled
   > (`-pooler`) endpoint. For a demo's traffic the direct URL is fine at runtime
   > too.

## Step 2 — Create the API project

1. Vercel → **Add New… → Project** → import `twoghostsalmost-star/ResumAI`
   **again** (a second project, separate from the web one).
2. Set **Root Directory = `apps/api`**.
3. Framework Preset: **Other**. Leave Build/Install commands as detected —
   `apps/api/vercel.json` overrides them with the correct monorepo-aware steps.

## Step 3 — Environment variables (API project)

Add these under **Settings → Environment Variables** (Production + Preview):

| Key | Value |
|---|---|
| `DATABASE_URL` | the **direct** Neon string from Step 1 |
| `JWT_SIGNING_SECRET` | any long random string (`openssl rand -hex 32`) |
| `PUBLIC_BASE_URL` | leave blank for now; set after first deploy to the API's URL |
| `ANTHROPIC_API_KEY` | *(optional)* enables the AI assistant + richer parsing |
| `STT_API_KEY` / `TTS_API_KEY` | *(optional)* voice |
| `LINKEDIN_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | *(optional)* LinkedIn sign-in |

If you added the Neon connector and it auto-set a `DATABASE_URL` pointing at the
**pooled** host, override it with the direct string (or the build's `db push`
may fail).

## Step 4 — Deploy

Click **Deploy**. The build will:
1. `pnpm install` (whole workspace), build `@resumeforge/shared`,
2. `prisma generate`, build the API,
3. `prisma db push` — creates all tables in your Neon database.

When it finishes, open `https://<your-api-project>.vercel.app/health` → expect
`{"ok":true,"service":"resumeforge-api"}`.

Then set `PUBLIC_BASE_URL` to that `https://<your-api-project>.vercel.app` and
redeploy (used for share links).

## Step 5 — Point the web app at the API

In your **web** Vercel project: **Settings → Environment Variables** →
`NEXT_PUBLIC_API_BASE_URL = https://<your-api-project>.vercel.app` → redeploy.

Done — the whole app runs on Vercel + Neon, entirely on free tiers.

---

## PDF export on serverless

PDF export needs headless Chromium. On Vercel the API uses
`@sparticuz/chromium` + `playwright-core` (optional deps, auto-installed),
launched only when `process.env.VERCEL` is set. The function is configured with
1024 MB memory and a 60 s max duration in `vercel.json`.

This works on many setups, but Chromium is heavy and can bump into Hobby-tier
function size/time limits. The code is defensive: if Chromium can't launch, the
PDF endpoint returns `503 {"error":"pdf_unavailable"}` instead of crashing, and
**DOCX and HTML export keep working** (both are pure-JS and always available).
The in-app preview and share link are unaffected.

If you need rock-solid PDF export, run the API as a container instead (the
Dockerfile bundles full Chromium) — see [`DEPLOY_API.md`](DEPLOY_API.md). But
for getting the app fully usable on free Vercel, this serverless path is the
fastest, and DOCX/HTML cover the export need if PDF hits a limit.

---

## Free alternatives to Render (if you ever want a container host)
- **Neon** / **Supabase** — free Postgres (works with any host; used above).
- **Fly.io** — free allowance for small VMs; runs the Dockerfile with full PDF.
- **Koyeb** — free web service (pair with Neon for the DB).

## Troubleshooting
- **Build fails at `prisma db push`** — `DATABASE_URL` is missing at build or
  points at the pooled (`-pooler`) host. Set it to the **direct** Neon string.
- **App loads but no data / CORS** — `NEXT_PUBLIC_API_BASE_URL` isn't set on the
  web project, or points at the wrong URL. The API sends permissive CORS.
- **`@resumeforge/shared` not found at build** — make sure Root Directory is
  `apps/api` (not the repo root) so `vercel.json` is picked up; it builds shared
  first.
- **PDF returns 503** — expected if Chromium exceeded limits; use DOCX/HTML or
  the container host.
