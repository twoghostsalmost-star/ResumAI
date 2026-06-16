import Fastify from "fastify";
import cors from "@fastify/cors";
import { resumeRoutes } from "./routes/resumes.js";
import { atsRoutes } from "./routes/ats.js";
import { assistantRoutes } from "./routes/assistant.js";
import { exportRoutes } from "./routes/export.js";

export function buildServer() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.register(resumeRoutes);
  app.register(atsRoutes);
  app.register(assistantRoutes);
  app.register(exportRoutes);

  return app;
}

const port = Number(process.env.PORT ?? 3000);
buildServer()
  .listen({ port, host: "0.0.0.0" })
  .then(() => console.log(`API listening on :${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
