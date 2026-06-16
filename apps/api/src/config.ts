/**
 * Centralised, typed access to environment configuration. Everything secret
 * lives here and is read server-side only — keys are never shipped to clients.
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SIGNING_SECRET ?? "dev-secret-change-me",
  demoUserId: process.env.DEMO_USER_ID ?? "demo-user",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "claude-sonnet-4-6",

  stt: {
    provider: (process.env.STT_PROVIDER ?? "deepgram") as "deepgram" | "whisper",
    apiKey: process.env.STT_API_KEY ?? "",
  },
  tts: {
    provider: (process.env.TTS_PROVIDER ?? "openai") as "elevenlabs" | "openai",
    apiKey: process.env.TTS_API_KEY ?? "",
    voiceId: process.env.TTS_VOICE_ID ?? "",
  },

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    redirectUri: process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3000/linkedin/callback",
  },

  // Descope — managed auth (Google/Apple/passwordless configured in Descope's
  // console, not here). The web app runs the flow; the API validates the
  // resulting session token. Only the projectId is required; the optional
  // management key lets us load a user's email if it's not in the token claims.
  descope: {
    projectId: process.env.DESCOPE_PROJECT_ID ?? "",
    managementKey: process.env.DESCOPE_MANAGEMENT_KEY ?? "",
  },

  piiEncryptionKey: process.env.PII_ENCRYPTION_KEY ?? "",
};

export function hasAnthropic() {
  return Boolean(config.anthropicApiKey);
}
