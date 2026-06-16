// Vercel Serverless Function entry for the ResumeForge API.
//
// Vercel routes every request (see vercel.json rewrites) to this handler. We
// build the Fastify app once per warm instance and replay the incoming Node
// request into it via the standard `server.emit('request', …)` bridge.
//
// Imports the *built* output (../dist/server.js) so there's no TS/ESM
// resolution to do at runtime — run the Vercel build command first.
import { buildServer } from "../dist/server.js";

let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await buildServer();
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
