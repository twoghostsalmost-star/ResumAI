# Deploy ResumeForge Web to Vercel

The web app (`apps/web`) is a Next.js 14 App Router project inside this pnpm
monorepo. It's already validated: `pnpm --filter @resumeforge/web build`
succeeds and produces 8 routes. This guide gets it onto a Vercel **Preview**
deployment in a few minutes.

> The branch `claude/react-native-nextjs-ios-app-xaxovf` is already pushed to
> GitHub, so the Git-integration path below will produce a preview URL on every
> push automatically.

---

## Option A — Vercel Git integration (recommended)

1. Go to **vercel.com → Add New… → Project** and import the GitHub repo
   `twoghostsalmost-star/ResumAI`.
2. In the project setup screen, set:
   - **Root Directory:** `apps/web`  ← important (click "Edit", pick `apps/web`).
   - **Framework Preset:** Next.js (auto-detected).
   - **Build Command:** leave default — `apps/web/vercel.json` already sets it to
     `pnpm --filter @resumeforge/shared build && next build` (this builds the
     shared types package first, which the web app depends on).
   - **Install Command:** default — `pnpm install --frozen-lockfile`
     (the committed `pnpm-lock.yaml` covers the whole workspace).
3. Add an **Environment Variable** (Production + Preview + Development):
   - `NEXT_PUBLIC_API_BASE_URL` = the URL of your deployed backend
     (e.g. `https://resumeforge-api.fly.dev`). For a quick demo you can point it
     at a tunneled local API (`ngrok http 3000`).
4. Click **Deploy**.

After the first deploy, **every push to any branch creates its own Preview
Deployment** with a unique URL. Pushing to the production branch updates the
production URL.

### Branch → Preview
Because the feature branch is already on GitHub, you can also just open the
repo's **Deployments** tab in Vercel after connecting and trigger a deploy of
`claude/react-native-nextjs-ios-app-xaxovf` to get a preview of this exact build.

---

## Option B — Vercel CLI (one-off, no Git integration)

```bash
npm i -g vercel
cd apps/web
vercel link            # choose/create the project
vercel env add NEXT_PUBLIC_API_BASE_URL preview   # paste your API URL
vercel                 # preview deploy → prints a preview URL
vercel --prod          # production deploy
```

Because this is a monorepo, run the CLI from `apps/web`. Vercel detects the
pnpm workspace at the repo root and installs from there; the `vercel.json` in
`apps/web` already wires the correct build command.

---

## What about the backend API?

The web app is a **thin client** — it needs the ResumeForge API running
somewhere reachable over HTTPS. Do **not** deploy `apps/api` to Vercel: PDF
export launches headless Chromium (Playwright), which exceeds typical
serverless limits. Deploy it as a long-lived container instead:

```bash
docker build -f docker/Dockerfile.api -t resumeforge-api .
docker run -p 3000:3000 --env-file .env resumeforge-api
```

**The easiest path is the one-click Render Blueprint** — see
[`DEPLOY_API.md`](DEPLOY_API.md), which provisions Postgres + the API and wires
them together (the container runs `prisma db push` on boot, so no manual
migration). Railway and Fly.io instructions are there too.

Then set the web app's `NEXT_PUBLIC_API_BASE_URL` to that API's URL and redeploy
(or just push — the env var is read at build/runtime).

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the API, iOS, and RN clients.

---

## Sanity check before you deploy

```bash
pnpm install
pnpm --filter @resumeforge/web build   # should print the 8-route table and exit 0
```

If that succeeds locally, the Vercel build will succeed too — it runs the same
command.

## Troubleshooting
- **`Cannot find module '@resumeforge/shared'`** — the build command must build
  shared first. It's already set in `apps/web/vercel.json`; if you overrode the
  Build Command in the dashboard, use
  `pnpm --filter @resumeforge/shared build && next build`.
- **`frozen-lockfile` errors** — make sure you imported the whole repo (the
  lockfile lives at the repo root), not just the `apps/web` folder.
- **Blank data / network errors in the app** — `NEXT_PUBLIC_API_BASE_URL` isn't
  set or the API isn't reachable/CORS-enabled. The API enables permissive CORS
  by default.
