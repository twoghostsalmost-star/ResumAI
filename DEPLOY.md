# Deploy ResumAI to Vercel — low-touch

Two projects, both from this repo: the **web** app (`apps/web`) and the **API**
(`apps/api`). Pick either path below — the env vars are part of the flow, so you
don't enter anything by hand in the dashboard afterwards.

---

## Path 1 — One-click Deploy buttons (env collected during import)

Each button clones the repo into your account, pre-sets the **Root Directory**,
and **prompts you for the required env vars on the import screen**. Deploy the
**API first**, then the web app (the web app needs the API's URL).

### 1. API — `apps/api`

[![Deploy API with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI&root-directory=apps%2Fapi&project-name=resumai-api&repository-name=resumai-api&env=DATABASE_URL,JWT_SIGNING_SECRET,DESCOPE_PROJECT_ID&envDescription=Neon%20DATABASE_URL%20%2B%20JWT%20secret%20%2B%20Descope%20project%20id&envLink=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI%2Fblob%2Fmain%2FDEPLOY_API_VERCEL.md&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%7D%5D)

- The **Neon** Postgres connector is offered during import → it injects
  `DATABASE_URL` (and the non-pooled URL the build uses for `prisma db push`).
- Three vars: `DATABASE_URL` (auto from Neon), `JWT_SIGNING_SECRET`, and
  `DESCOPE_PROJECT_ID`. Google/Apple/passwordless are configured **in Descope's
  console**, so there are no provider secrets to set here.
- After it deploys, copy the API URL and set `PUBLIC_BASE_URL` to it (share links).

### 2. Web — `apps/web`

[![Deploy Web with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI&root-directory=apps%2Fweb&project-name=resumai-web&repository-name=resumai-web&env=NEXT_PUBLIC_API_BASE_URL,NEXT_PUBLIC_DESCOPE_PROJECT_ID&envDescription=API%20URL%20%2B%20Descope%20project%20id%20(both%20public)&envLink=https%3A%2F%2Fgithub.com%2Ftwoghostsalmost-star%2FResumAI%2Fblob%2Fmain%2FDEPLOY.md)

- `NEXT_PUBLIC_API_BASE_URL` = the API URL from step 1.
- `NEXT_PUBLIC_DESCOPE_PROJECT_ID` = your Descope project id (public).

> The buttons create **fresh** projects. If you already have the messy
> `resumeai` / `resumai-webapp` projects, delete them after these go green so
> you're left with one web + one API.

---

## Path 2 — v0 / deploy-agent prompt (paste this)

If you're driving the deploy from **v0** or any agent/CLI that has access to your
Vercel account, paste the prompt below. It encodes the whole workflow — projects,
root directories, env vars, the Neon connector, and the OAuth redirect URIs — so
nothing is left to manual dashboard entry.

```text
Deploy the GitHub repo twoghostsalmost-star/ResumAI to Vercel as TWO projects on
the "evolution" team. It is a pnpm monorepo.

PROJECT A — API
- Name: resumai-api
- Root Directory: apps/api
- Framework: Other (apps/api/vercel.json defines the build; it runs prisma db
  push against the non-pooled DB URL automatically)
- Add the Neon Postgres storage integration to THIS project (it injects
  DATABASE_URL + DATABASE_URL_UNPOOLED).
- Set env vars (Production + Preview + Development):
    JWT_SIGNING_SECRET    = <generate: openssl rand -hex 32>
    DESCOPE_PROJECT_ID    = <your Descope project id, e.g. P2x...>
    DESCOPE_MANAGEMENT_KEY= <optional; only if email isn't in the session JWT>
- Deploy. Then set PUBLIC_BASE_URL = the API's own deployed URL and redeploy.
- Confirm GET /health returns {"ok":true,"service":"resumeforge-api"}.

PROJECT B — WEB
- Name: resumai-web
- Root Directory: apps/web
- Framework: Next.js (auto)
- Set env vars:
    NEXT_PUBLIC_API_BASE_URL       = the API's deployed URL
    NEXT_PUBLIC_DESCOPE_PROJECT_ID = the same Descope project id (public)
- Deploy.

AUTH: Google / Apple / passwordless are all configured inside the Descope
console (Authentication Methods + the "sign-up-or-in" flow). No provider
secrets or redirect URIs are set in Vercel.
```

> Note: v0.dev is primarily a UI generator — it can scaffold and deploy
> front-ends, but it won't autonomously provision a database or set backend
> secrets. For the API, use Path 1's button (or a Vercel-CLI agent). The prompt
> above is the exact spec to hand to whatever does the deploying.

---

## Why the build is now turnkey
`apps/api/vercel.json` runs `prisma db push` against
`POSTGRES_URL_NON_POOLING` / `DATABASE_URL_UNPOOLED` when present (falling back to
`DATABASE_URL`). So whether the DB comes from the Neon connector or a pasted
string, the schema is created at build time without the pooled-connection error.
Runtime keeps using the pooled `DATABASE_URL`.
