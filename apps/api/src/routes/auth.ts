import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../lib/auth.js";

const SessionBody = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

/**
 * Passwordless session bootstrap. In production this would be gated by a magic
 * link / OAuth; for the app it upserts the user and mints a signed token the
 * web and iOS clients store in secure storage.
 */
export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/session", async (req) => {
    const { email, name } = SessionBody.parse(req.body);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name ?? undefined },
      create: { email, name },
    });
    const token = signToken({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  });

  app.get("/me", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return reply.code(404).send({ error: "not_found" });
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  });
}
