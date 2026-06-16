import { FastifyInstance } from "fastify";
import { ResumeSchema } from "@resumeforge/shared";
import { prisma } from "../db.js";
import { scoreResume } from "../pipeline/ats-scorer.js";

export async function atsRoutes(app: FastifyInstance) {
  // Score by stored id (persists the result)
  app.post("/resumes/:id/score", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.resume.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    const resume = ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });
    const result = scoreResume(resume);
    await prisma.resume.update({ where: { id }, data: { atsScore: result } });
    return result;
  });

  // Stateless score of an arbitrary resume body (used for live preview scoring)
  app.post("/ats/score", async (req) => {
    const resume = ResumeSchema.parse(req.body);
    return scoreResume(resume);
  });
}
