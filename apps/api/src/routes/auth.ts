import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../lib/auth.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const session = (user: { id: string; email: string; name: string | null }) => ({
  token: signToken({ sub: user.id, email: user.email }),
  user: { id: user.id, email: user.email, name: user.name },
});

/**
 * Email + password auth. Passwords are scrypt-hashed (see lib/password.ts) and
 * never returned. A successful register/login mints the app's HS256 token that
 * every route already understands; clients store it and send it as a bearer.
 */
export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const { email: rawEmail, password, name } = RegisterBody.parse(req.body);
    const email = rawEmail.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: "email_taken" });

    const user = await prisma.user.create({
      data: { email, name, passwordHash: hashPassword(password) },
    });
    return session(user);
  });

  app.post("/auth/login", async (req, reply) => {
    const { email: rawEmail, password } = LoginBody.parse(req.body);
    const email = rawEmail.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    return session(user);
  });

  app.get("/me", async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return reply.code(404).send({ error: "not_found" });
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  });
}
