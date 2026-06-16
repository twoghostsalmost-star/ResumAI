import { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseResumeText, extractText } from "../pipeline/parse-resume.js";

/**
 * Import pipeline endpoints. Both land the client on a *review screen* with the
 * parsed draft + low-confidence flags — parsing is never assumed perfect, and
 * nothing is persisted until the user confirms (the client then POSTs /resumes).
 */
export async function parseRoutes(app: FastifyInstance) {
  // Parse from already-extracted text (e.g. pasted resume, or client extraction).
  app.post("/parse/text", async (req) => {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    return parseResumeText(text, req.userId);
  });

  // Parse from an uploaded file (multipart). Falls back to raw decode if the
  // optional pdf/docx extractors aren't installed.
  app.post("/parse/upload", async (req, reply) => {
    const anyReq = req as any;
    if (typeof anyReq.file !== "function") {
      return reply.code(415).send({ error: "multipart_not_enabled" });
    }
    const file = await anyReq.file();
    if (!file) return reply.code(400).send({ error: "no_file" });
    const buf = await file.toBuffer();
    const text = await extractText(buf, file.mimetype ?? "", file.filename ?? "");
    if (!text.trim()) return reply.code(422).send({ error: "no_text_extracted" });
    return parseResumeText(text, req.userId);
  });
}
