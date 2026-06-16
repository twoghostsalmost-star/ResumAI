import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ResumeSchema, ResumePatchSchema, applyPatches } from "@resumeforge/shared";
import { prisma } from "../db.js";
import { AnthropicProvider } from "../providers/llm/anthropic.js";

const provider = new AnthropicProvider();

const SYSTEM = `You are a resume-writing expert embedded in an app.
You receive the user's current resume as JSON and a message. Reply helpfully and,
when you want to change the resume, return a JSON object of the form:
{"reply": "<short natural language>", "patches": [<ResumePatch>...]}
A ResumePatch is one of:
{"op":"set","path":"basics.summary","value":"..."}
{"op":"push","path":"sections.0.items.0.bullets","value":"..."}
{"op":"removeAt","path":"sections.0.items","index":1}
{"op":"move","path":"sections","from":2,"to":0}
Paths are dot-separated; numeric segments index arrays.
Never invent facts the user hasn't provided. If you have no edit, return an empty patches array.
Respond with ONLY the JSON object, no markdown fencing.`;

const AssistantResponse = z.object({
  reply: z.string(),
  patches: z.array(ResumePatchSchema).default([]),
});

export async function assistantRoutes(app: FastifyInstance) {
  app.post("/resumes/:id/assistant", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { message } = z.object({ message: z.string() }).parse(req.body);

    const row = await prisma.resume.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    const resume = ResumeSchema.parse({ ...(row.data as object), id: row.id, userId: row.userId });

    const history = await prisma.conversationTurn.findMany({
      where: { resumeId: id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const messages = [
      ...history.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
      { role: "user" as const, content: `CURRENT_RESUME:\n${JSON.stringify(resume)}\n\nMESSAGE:\n${message}` },
    ];

    const llm = await provider.complete({ system: SYSTEM, messages });

    // Parse + validate the model's structured output, repairing on failure.
    let parsed: z.infer<typeof AssistantResponse>;
    try {
      const cleaned = llm.text.replace(/```json|```/g, "").trim();
      parsed = AssistantResponse.parse(JSON.parse(cleaned));
    } catch {
      parsed = { reply: llm.text, patches: [] };
    }

    // Validate patches actually apply before returning them to the client.
    let validPatches = parsed.patches;
    try {
      applyPatches(resume, parsed.patches);
    } catch {
      validPatches = []; // drop unsound patches; keep the natural-language reply
    }

    await prisma.conversationTurn.create({
      data: { resumeId: id, role: "user", content: message },
    });
    await prisma.conversationTurn.create({
      data: { resumeId: id, role: "assistant", content: parsed.reply, patches: validPatches },
    });

    // Patches are returned as PROPOSALS — the client shows accept/edit/reject
    // and calls POST /resumes/:id/patch on accept. Nothing is mutated here.
    return { reply: parsed.reply, patches: validPatches };
  });
}
