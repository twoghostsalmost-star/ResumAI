import type { FastifyInstance, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { config } from "../config.js";

/**
 * Lightweight JWT (HS256) implemented with Node crypto so the API has no extra
 * dependency to install. Tokens are signed server-side and carry only the user
 * id + email — never secrets. A passwordless "session" endpoint upserts the user
 * and mints a token; clients store it and send `Authorization: Bearer <token>`.
 */

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(payload: Record<string, unknown>, expiresInSec = 60 * 60 * 24 * 30): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const head = b64url(JSON.stringify(header));
  const data = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", config.jwtSecret).update(`${head}.${data}`).digest("base64url");
  return `${head}.${data}.${sig}`;
}

export function verifyToken(token: string): { sub: string; email?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, data, sig] = parts;
  const expected = crypto.createHmac("sha256", config.jwtSecret).update(`${head}.${data}`).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString());
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolve the acting user id for a request. Prefers a valid bearer token; falls
 * back to an `x-user-id` header and finally the demo user, so the existing
 * mobile client keeps working while real auth is adopted.
 */
export function resolveUserId(req: FastifyRequest): string {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const claims = verifyToken(auth.slice(7));
    if (claims?.sub) return claims.sub;
  }
  const headerId = req.headers["x-user-id"];
  if (typeof headerId === "string" && headerId) return headerId;
  return config.demoUserId;
}

export function registerAuthDecorator(app: FastifyInstance) {
  app.decorateRequest("userId", "");
  app.addHook("onRequest", async (req) => {
    (req as FastifyRequest & { userId: string }).userId = resolveUserId(req);
  });
}

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}
