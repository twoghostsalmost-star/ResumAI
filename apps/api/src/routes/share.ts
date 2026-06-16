import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { ResumeSchema } from "@resumeforge/shared";
import { prisma } from "../db.js";
import { renderResumeHtml } from "../pipeline/export-html.js";
import { config } from "../config.js";

const SHARE_TTL_DAYS = 30;

export async function shareRoutes(app: FastifyInstance) {
  // Create (or refresh) a tokenized, expiring public link for a resume.
  app.post("/resumes/:id/share", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.resume.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    if (row.userId !== req.userId) return reply.code(403).send({ error: "forbidden" });

    const token = randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.exportArtifact.create({
      data: {
        resumeId: id,
        format: "html",
        storageKey: "inline",
        resumeVersion: row.updatedAt,
        shareToken: token,
        shareExpires: expires,
      },
    });
    return { url: `${config.publicBaseUrl}/share/${token}`, token, expiresAt: expires.toISOString() };
  });

  // Public, read-only share page (real selectable text, ATS-safe markup).
  app.get("/share/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const artifact = await prisma.exportArtifact.findUnique({ where: { shareToken: token } });
    if (!artifact || (artifact.shareExpires && artifact.shareExpires < new Date())) {
      reply.code(404).header("content-type", "text/html");
      return "<h1>This link has expired</h1>";
    }
    const row = await prisma.resume.findUnique({ where: { id: artifact.resumeId } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    const resume = ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });
    reply.header("content-type", "text/html; charset=utf-8");
    return renderResumeHtml(resume);
  });
}
