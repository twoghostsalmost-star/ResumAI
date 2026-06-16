import { FastifyInstance } from "fastify";
import { z } from "zod";
import DescopeClient from "@descope/node-sdk";
import { prisma } from "../db.js";
import { signToken } from "../lib/auth.js";
import { config } from "../config.js";

/**
 * Descope is the identity provider — Google/Apple/passwordless are all
 * configured inside Descope's console, so there are no provider secrets or
 * redirect URIs to wire up here. The web app runs the Descope flow and posts
 * the resulting session JWT to this endpoint; we validate it, upsert the user,
 * and mint the app's own session token (the same HS256 token every route
 * already understands). Identity is taken from the *validated* token, never
 * from anything the client claims.
 */

let client: ReturnType<typeof DescopeClient> | null = null;
function getClient() {
  if (!config.descope.projectId) return null;
  if (!client) {
    client = DescopeClient({
      projectId: config.descope.projectId,
      managementKey: config.descope.managementKey || undefined,
    });
  }
  return client;
}

export async function descopeRoutes(app: FastifyInstance) {
  app.post("/auth/descope", async (req, reply) => {
    const descope = getClient();
    if (!descope) return reply.code(501).send({ error: "descope_not_configured" });

    const { sessionToken } = z.object({ sessionToken: z.string().min(1) }).parse(req.body);

    let claims: Record<string, unknown>;
    try {
      const authInfo = await descope.validateSession(sessionToken);
      claims = authInfo.token as Record<string, unknown>;
    } catch {
      return reply.code(401).send({ error: "invalid_session" });
    }

    let email = typeof claims.email === "string" ? claims.email : undefined;
    let name = typeof claims.name === "string" ? claims.name : undefined;

    // Email isn't always in the session token; fall back to the management API
    // (only available when a management key is configured).
    if (!email && config.descope.managementKey && typeof claims.sub === "string") {
      try {
        const res = await descope.management.user.loadByUserId(claims.sub);
        email = res.data?.email ?? email;
        name = name ?? res.data?.name ?? undefined;
      } catch {
        /* fall through to the error below */
      }
    }

    if (!email) {
      return reply.code(422).send({
        error: "email_unavailable",
        hint: "Add email to the Descope session JWT claims, or set DESCOPE_MANAGEMENT_KEY.",
      });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name ?? undefined },
      create: { email, name },
    });
    const token = signToken({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  });
}
