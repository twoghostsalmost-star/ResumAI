import { FastifyInstance, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { signToken, verifyToken } from "../lib/auth.js";
import { config } from "../config.js";

/**
 * "Sign in with Google" and "Sign in with Apple" — a dependency-free OAuth/OIDC
 * solution built on the same HS256 JWT the rest of the API already uses.
 *
 * Flow for both providers:
 *   1. Browser hits  GET /auth/<provider>/start  → we 302 to the provider with a
 *      short-lived signed `state` (CSRF guard).
 *   2. Provider redirects back to /auth/<provider>/callback with an auth code.
 *   3. We exchange the code for tokens, read the identity, upsert the user, mint
 *      our own session JWT, and 302 back to the web app's /auth/finish#token=...
 *      (token in the fragment so it never lands in server logs or Referer).
 *
 * Real provider credentials are required (env vars) — see .env.example. Without
 * them the buttons render but /start returns the browser to the app with an
 * ?authError so the UI can explain what's missing.
 */

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function makeState(provider: string): string {
  return signToken({ purpose: "oauth", provider }, 600); // 10 minutes
}

function stateOk(state: string | undefined): boolean {
  return Boolean(state && verifyToken(state));
}

function backToAppWithError(reply: FastifyReply, code: string) {
  return reply.redirect(`${config.publicWebUrl}/?authError=${encodeURIComponent(code)}`);
}

/** Upsert the user, mint a session token, and hand the browser back to the SPA. */
async function finishLogin(reply: FastifyReply, identity: { email: string; name?: string }) {
  const user = await prisma.user.upsert({
    where: { email: identity.email },
    update: { name: identity.name ?? undefined },
    create: { email: identity.email, name: identity.name },
  });
  const token = signToken({ sub: user.id, email: user.email });
  const frag = new URLSearchParams({
    token,
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
  });
  return reply.redirect(`${config.publicWebUrl}/auth/finish#${frag.toString()}`);
}

/**
 * Apple requires the OAuth `client_secret` to be an ES256 JWT signed with the
 * .p8 key. Node's crypto can do this with `dsaEncoding: "ieee-p1363"` (JOSE
 * needs the raw r||s signature, not DER).
 */
function appleClientSecret(): string {
  const { teamId, keyId, clientId, privateKey } = config.apple;
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 30,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = crypto.createPrivateKey(privateKey.replace(/\\n/g, "\n"));
  const sig = crypto.sign("sha256", Buffer.from(signingInput), { key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(sig)}`;
}

/** Decode (without re-verifying) a JWT we received directly from a provider's
 *  token endpoint over TLS. Safe here because the channel itself is trusted. */
function decodeJwtPayload<T>(jwt: string): T {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()) as T;
}

export async function oauthRoutes(app: FastifyInstance) {
  const googleRedirect = `${config.publicBaseUrl}/auth/google/callback`;
  const appleRedirect = `${config.publicBaseUrl}/auth/apple/callback`;

  // ── Google ──────────────────────────────────────────────────────────────
  app.get("/auth/google/start", async (_req, reply) => {
    if (!config.google.clientId) return backToAppWithError(reply, "google_not_configured");
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: googleRedirect,
      response_type: "code",
      scope: "openid email profile",
      state: makeState("google"),
      prompt: "select_account",
    });
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/auth/google/callback", async (req, reply) => {
    const { code, state } = (req.query ?? {}) as { code?: string; state?: string };
    if (!code || !stateOk(state)) return backToAppWithError(reply, "google_state_invalid");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: googleRedirect,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return backToAppWithError(reply, "google_token_failed");
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return backToAppWithError(reply, "google_no_id_token");

    const claims = decodeJwtPayload<{ email?: string; name?: string; email_verified?: boolean }>(id_token);
    if (!claims.email) return backToAppWithError(reply, "google_no_email");
    return finishLogin(reply, { email: claims.email, name: claims.name });
  });

  // ── Apple ───────────────────────────────────────────────────────────────
  app.get("/auth/apple/start", async (_req, reply) => {
    if (!config.apple.clientId) return backToAppWithError(reply, "apple_not_configured");
    const params = new URLSearchParams({
      client_id: config.apple.clientId,
      redirect_uri: appleRedirect,
      response_type: "code",
      response_mode: "form_post", // Apple POSTs the result when scopes are requested
      scope: "name email",
      state: makeState("apple"),
    });
    return reply.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  });

  // Apple sends the result as an application/x-www-form-urlencoded POST.
  app.post("/auth/apple/callback", async (req, reply) => {
    const body = (req.body ?? {}) as { code?: string; state?: string; user?: string };
    if (!body.code || !stateOk(body.state)) return backToAppWithError(reply, "apple_state_invalid");
    if (!config.apple.teamId || !config.apple.keyId || !config.apple.privateKey) {
      return backToAppWithError(reply, "apple_not_configured");
    }

    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: body.code,
        redirect_uri: appleRedirect,
        client_id: config.apple.clientId,
        client_secret: appleClientSecret(),
      }),
    });
    if (!tokenRes.ok) return backToAppWithError(reply, "apple_token_failed");
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return backToAppWithError(reply, "apple_no_id_token");

    const claims = decodeJwtPayload<{ email?: string }>(id_token);
    if (!claims.email) return backToAppWithError(reply, "apple_no_email");

    // Apple only returns the name on the *first* authorization, in `user`.
    let name: string | undefined;
    if (body.user) {
      try {
        const parsed = JSON.parse(body.user) as { name?: { firstName?: string; lastName?: string } };
        name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ") || undefined;
      } catch {
        /* ignore malformed user payload */
      }
    }
    return finishLogin(reply, { email: claims.email, name });
  });
}
