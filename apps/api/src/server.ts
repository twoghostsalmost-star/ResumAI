import Fastify from "fastify";
import cors from "@fastify/cors";
import { resumeRoutes } from "./routes/resumes.js";
import { atsRoutes } from "./routes/ats.js";
import { assistantRoutes } from "./routes/assistant.js";
import { exportRoutes } from "./routes/export.js";
import { authRoutes } from "./routes/auth.js";
import { parseRoutes } from "./routes/parse.js";
import { voiceRoutes } from "./routes/voice.js";
import { shareRoutes } from "./routes/share.js";
import { accountRoutes } from "./routes/account.js";
import { linkedinRoutes } from "./routes/linkedin.js";
import { oauthRoutes } from "./routes/oauth.js";
import { registerAuthDecorator } from "./lib/auth.js";
import { config } from "./config.js";

export async function buildServer() {
  const app = Fastify({ logger: true, bodyLimit: 25 * 1024 * 1024 });
  await app.register(cors, { origin: true });

  // Apple's "Sign in with Apple" posts the OAuth result as form-urlencoded.
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(body as string)));
      } catch (err) {
        done(err as Error);
      }
    }
  );

  // Accept raw audio bodies for the voice STT proxy.
  app.addContentTypeParser(
    ["audio/wav", "audio/mp4", "audio/m4a", "audio/mpeg", "audio/webm", "application/octet-stream"],
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body)
  );

  // Optional multipart for file uploads (parse/upload). Registered if available.
  try {
    const multipart = await import("@fastify/multipart");
    await app.register(multipart.default, { limits: { fileSize: 20 * 1024 * 1024 } });
  } catch {
    app.log.warn("@fastify/multipart not installed — /parse/upload disabled (use /parse/text)");
  }

  registerAuthDecorator(app);

  app.get("/health", async () => ({ ok: true, service: "resumeforge-api" }));

  await app.register(authRoutes);
  await app.register(resumeRoutes);
  await app.register(atsRoutes);
  await app.register(assistantRoutes);
  await app.register(exportRoutes);
  await app.register(parseRoutes);
  await app.register(voiceRoutes);
  await app.register(shareRoutes);
  await app.register(accountRoutes);
  await app.register(linkedinRoutes);
  await app.register(oauthRoutes);

  return app;
}

// Only auto-start when run as a script (not when imported by a serverless handler).
const isDirectRun = Boolean(process.argv[1] && process.argv[1].endsWith("server.js"));
if (isDirectRun || process.env.START_SERVER === "1") {
  buildServer()
    .then((app) => app.listen({ port: config.port, host: "0.0.0.0" }))
    .then(() => console.log(`API listening on :${config.port}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
