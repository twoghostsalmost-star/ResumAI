import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ResumeSchema } from "@resumeforge/shared";
import { config } from "../config.js";

/**
 * LinkedIn "Sign In with LinkedIn using OpenID Connect". Yields basic identity
 * (name, email, picture) — NOT full work history (LinkedIn restricts that for
 * third parties). The PDF-export fallback (Save to PDF → /parse/upload) brings
 * in full experience. Both land the user on the review screen.
 */
export async function linkedinRoutes(app: FastifyInstance) {
  app.get("/linkedin/auth-url", async (_req, reply) => {
    if (!config.linkedin.clientId) {
      return reply.code(501).send({ error: "linkedin_not_configured", fallback: "/parse/upload" });
    }
    const state = randomUUID();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.redirectUri,
      scope: "openid profile email",
      state,
    });
    return { url: `https://www.linkedin.com/oauth/v2/authorization?${params}`, state };
  });

  app.get("/linkedin/callback", async (req, reply) => {
    const { code } = z.object({ code: z.string(), state: z.string().optional() }).parse(req.query);
    if (!config.linkedin.clientId || !config.linkedin.clientSecret) {
      return reply.code(501).send({ error: "linkedin_not_configured" });
    }

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.linkedin.redirectUri,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
      }),
    });
    if (!tokenRes.ok) return reply.code(502).send({ error: "token_exchange_failed", detail: await tokenRes.text() });
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) return reply.code(502).send({ error: "userinfo_failed", detail: await infoRes.text() });
    const info = (await infoRes.json()) as {
      name?: string;
      email?: string;
      locale?: string;
      picture?: string;
    };

    const now = new Date().toISOString();
    const draft = ResumeSchema.parse({
      id: "pending",
      userId: req.userId,
      title: info.name ? `${info.name} — Resume` : "LinkedIn Resume",
      basics: {
        fullName: info.name ?? "",
        email: info.email,
        links: [],
      },
      sections: [],
      design: {},
      source: "linkedin",
      createdAt: now,
      updatedAt: now,
    });

    // Return the seeded draft for the review screen. Full history comes from the
    // PDF fallback. (A production build may also redirect back into the app via
    // a deep link carrying a short-lived handoff token.)
    return { resume: draft, lowConfidenceFields: ["basics.fullName"], method: "linkedin-oidc" };
  });
}
