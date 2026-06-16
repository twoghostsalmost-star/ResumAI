import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

/**
 * Privacy / data controls (spec §13). Real export-my-data and hard-delete:
 * removing the user cascades to resumes, conversations, exports and files.
 */
export async function accountRoutes(app: FastifyInstance) {
  // Export everything we hold for the acting user, as JSON.
  app.get("/me/export", async (req, reply) => {
    const userId = req.userId;
    const [user, resumes, files] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.resume.findMany({
        where: { userId },
        include: { conversation: true, exports: true },
      }),
      prisma.uploadedFile.findMany({ where: { userId } }),
    ]);
    if (!user) return reply.code(404).send({ error: "not_found" });
    reply.header("content-disposition", `attachment; filename="resumeforge-data-export.json"`);
    return { exportedAt: new Date().toISOString(), user, resumes, files };
  });

  // Hard delete the account and all associated data.
  app.delete("/me", async (req, reply) => {
    const userId = req.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ error: "not_found" });
    await prisma.user.delete({ where: { id: userId } }); // cascades per schema
    return reply.code(204).send();
  });
}
