/**
 * Centralised, typed access to environment configuration. Everything secret
 * lives here and is read server-side only — keys are never shipped to clients.
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SIGNING_SECRET ?? "dev-secret-change-me",
  demoUserId: process.env.DEMO_USER_ID ?? "demo-user",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  // Where the API sends the browser back to after a social login completes.
  publicWebUrl: process.env.WEB_BASE_URL ?? "http://localhost:3001",

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

  // Sign in with Google — standard OAuth 2.0 client (Google Cloud Console).
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },

  // Sign in with Apple — the "client secret" is an ES256 JWT we mint from the
  // Services ID (clientId), Team ID, Key ID and the .p8 private key contents.
  apple: {
    clientId: process.env.APPLE_CLIENT_ID ?? "", // Services ID, e.g. com.resumai.web
    teamId: process.env.APPLE_TEAM_ID ?? "",
    keyId: process.env.APPLE_KEY_ID ?? "",
    privateKey: process.env.APPLE_PRIVATE_KEY ?? "", // .p8 contents (\n-escaped ok)
  },

  piiEncryptionKey: process.env.PII_ENCRYPTION_KEY ?? "",
};

export function hasAnthropic() {
  return Boolean(config.anthropicApiKey);
}
