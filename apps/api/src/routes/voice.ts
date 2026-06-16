import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSTT } from "../providers/speech/stt.js";
import { getTTS } from "../providers/speech/tts.js";

/**
 * Voice proxy. Keys stay server-side; the app streams mic audio here for
 * transcription and posts assistant text for synthesis. The same conversation
 * engine (routes/assistant) handles the transcript.
 */
export async function voiceRoutes(app: FastifyInstance) {
  // Speech-to-text: raw audio body → transcript.
  app.post("/voice/stt", async (req, reply) => {
    const mime = (req.headers["content-type"] as string) ?? "audio/wav";
    const body = req.body as Buffer;
    if (!body || !Buffer.isBuffer(body)) return reply.code(400).send({ error: "expected_audio_body" });
    try {
      const transcript = await getSTT().transcribe(body, mime);
      return transcript;
    } catch (e: any) {
      return reply.code(502).send({ error: "stt_failed", detail: String(e?.message ?? e) });
    }
  });

  // Text-to-speech: text → audio bytes (mp3).
  app.post("/voice/tts", async (req, reply) => {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    try {
      const { audio, mime } = await getTTS().speak(text);
      reply.header("content-type", mime);
      return reply.send(audio);
    } catch (e: any) {
      return reply.code(502).send({ error: "tts_failed", detail: String(e?.message ?? e) });
    }
  });
}
