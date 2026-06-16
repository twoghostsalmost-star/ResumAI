# Deploy the ResumeForge API

The API (`apps/api`) is a Fastify server that needs **Postgres** and, for PDF
export, **headless Chromium**. That combination runs best as a long-lived
container, not on serverless. A `Dockerfile` (`docker/Dockerfile.api`) is
provided; it builds everything, bundles Chromium, and on boot runs
`prisma db push` to create tables on a fresh database — so there's no separate
migration step.

I can't run the deploy from this environment (no host credentials here), but
everything below is ready to click. Pick one:

---

## Easiest: Render (one-click Blueprint) ⭐

A `render.yaml` Blueprint is committed at the repo root. It provisions a free
Postgres database **and** the Dockerized API, and wires `DATABASE_URL`
automatically.

1. Push this repo to GitHub (already done on `main`).
2. Go to **[dashboard.render.com](https://dashboard.render.com)** → **New +** →
   **Blueprint**.
3. Connect the `twoghostsalmost-star/ResumAI` repo. Render detects `render.yaml`
   and shows the database + `resumeforge-api` service. Click **Apply**.
4. Wait for the build (it installs Chromium, so the first build takes a few
   minutes). When live, open `https://<your-service>.onrender.com/health` — you
   should see `{"ok":true,"service":"resumeforge-api"}`.
5. In the service's **Environment**, set `PUBLIC_BASE_URL` to that
   `https://<your-service>.onrender.com` URL (used for share links). Optionally
   add `ANTHROPIC_API_KEY` (enables the LLM assistant + richer parsing) and the
   `STT_*` / `TTS_*` / `LINKEDIN_*` keys. Save → it redeploys.

`JWT_SIGNING_SECRET` is auto-generated. Without the optional keys the API still
runs — features degrade gracefully (heuristic parser, manual editing, etc.).

> Free Postgres on Render expires after 90 days and the free web service sleeps
> when idle (first request after sleep is slow). Fine for a demo; upgrade for
> anything real.

---

## Also easy: Railway

Railway deploys the same Dockerfile and offers a managed Postgres plugin.

1. **[railway.app](https://railway.app)** → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. Railway detects `docker/Dockerfile.api`. If it doesn't, set the service's
   Dockerfile path to `docker/Dockerfile.api` and build context to the repo root.
3. **New → Database → PostgreSQL.** Railway exposes `DATABASE_URL`; reference it
   from the API service (Variables → add `DATABASE_URL = ${{Postgres.DATABASE_URL}}`).
4. Add `JWT_SIGNING_SECRET` (any random string) and `PORT=3000`. Optionally the
   provider keys. Deploy, then hit `/health`.

---

## Also works: Fly.io

```bash
brew install flyctl
fly launch --dockerfile docker/Dockerfile.api --no-deploy   # generates fly.toml
fly postgres create                                         # managed Postgres
fly postgres attach <pg-app-name>                           # sets DATABASE_URL
fly secrets set JWT_SIGNING_SECRET=$(openssl rand -hex 32)
fly deploy
```

---

## About Vercel for the API

You *can* host a Fastify app on Vercel, but **PDF export won't work there** —
Vercel's serverless functions can't launch Chromium within the size/time limits.
The API is hardened to degrade (PDF returns `503 pdf_unavailable`; DOCX and HTML
export still work), but for full functionality use one of the container hosts
above. Keep **Vercel for the web app** (`apps/web`) and run the API as a
container — that's the intended split.

---

## After the API is up
Point the web app at it:
- In your Vercel project for `apps/web`, set
  `NEXT_PUBLIC_API_BASE_URL = https://<your-api-host>` and redeploy.
- For the iOS / RN apps, set the API base URL in Settings (iOS) or
  `EXPO_PUBLIC_API_BASE_URL` (RN).

## Local sanity check (optional, needs Docker)
```bash
docker build -f docker/Dockerfile.api -t resumeforge-api .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SIGNING_SECRET="dev-secret" \
  resumeforge-api
curl localhost:3000/health
```
