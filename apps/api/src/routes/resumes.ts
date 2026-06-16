import { FastifyInstance } from "fastify";
import { ResumeSchema, applyPatches, ResumePatchSchema } from "@resumeforge/shared";
import { z } from "zod";
import { prisma } from "../db.js";

const CreateResumeBody = z.object({
  userId: z.string(),
  title: z.string().optional(),
  source: z.enum(["scratch", "upload", "linkedin"]).optional(),
  data: ResumeSchema.partial().optional(),
});

function emptyResume(userId: string, title: string, source: string) {
  const now = new Date().toISOString();
  return ResumeSchema.parse({
    id: "pending",
    userId,
    title,
    basics: { fullName: "", links: [] },
    sections: [],
    design: {},
    source,
    createdAt: now,
    updatedAt: now,
  });
}

export async function resumeRoutes(app: FastifyInstance) {
  // Create
  app.post("/resumes", async (req, reply) => {
    const body = CreateResumeBody.parse(req.body);
    const base = emptyResume(body.userId, body.title ?? "Untitled Resume", body.source ?? "scratch");
    const data = body.data ? ResumeSchema.parse({ ...base, ...body.data, userId: body.userId }) : base;

    const row = await prisma.resume.create({
      data: {
        userId: body.userId,
        title: data.title,
        source: data.source,
        targetRole: data.targetRole,
        targetJobDescription: data.targetJobDescription,
        data: { ...data, id: "self" },
      },
    });
    const full = ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });
    return reply.code(201).send(full);
  });

  // Read one
  app.get("/resumes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.resume.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    return ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });
  });

  // List for a user
  app.get("/resumes", async (req) => {
    const { userId } = req.query as { userId: string };
    const rows = await prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
      updatedAt: r.updatedAt,
      atsScore: r.atsScore,
    }));
  });

  // Full replace
  app.put("/resumes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const incoming = ResumeSchema.parse({ ...(req.body as object), id });
    const row = await prisma.resume.update({
      where: { id },
      data: {
        title: incoming.title,
        targetRole: incoming.targetRole,
        targetJobDescription: incoming.targetJobDescription,
        data: { ...incoming, updatedAt: new Date().toISOString() },
      },
    });
    return ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });
  });

  // Apply patches (used by assistant accept / ATS auto-fix)
  app.post("/resumes/:id/patch", async (req, reply) => {
    const { id } = req.params as { id: string };
    const patches = z.array(ResumePatchSchema).parse((req.body as any).patches);
    const row = await prisma.resume.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    const current = ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });
    const next = applyPatches(current, patches);
    const saved = await prisma.resume.update({
      where: { id },
      data: { data: next, title: next.title },
    });
    return ResumeSchema.parse({ ...(saved.data as object), id: saved.id, userId: saved.userId });
  });

  // Delete
  app.delete("/resumes/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.resume.delete({ where: { id } });
    return reply.code(204).send();
  });
}
