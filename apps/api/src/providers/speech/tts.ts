import { TextToSpeech } from "./index.js";
import { config } from "../../config.js";

/** ElevenLabs streaming TTS. */
class ElevenLabsTTS implements TextToSpeech {
  async speak(text: string): Promise<{ audio: Buffer; mime: string }> {
    if (!config.tts.apiKey) throw new Error("TTS_API_KEY is not configured");
    const voice = config.tts.voiceId || "21m00Tcm4TlvDq8ikWAM"; // default "Rachel"
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: { "xi-api-key": config.tts.apiKey, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_turbo_v2" }),
    });
    if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
    return { audio: Buffer.from(await res.arrayBuffer()), mime: "audio/mpeg" };
  }
}

/** OpenAI TTS. */
class OpenAITTS implements TextToSpeech {
  async speak(text: string): Promise<{ audio: Buffer; mime: string }> {
    if (!config.tts.apiKey) throw new Error("TTS_API_KEY is not configured");
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.tts.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: config.tts.voiceId || "alloy", input: text }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS error ${res.status}: ${await res.text()}`);
    return { audio: Buffer.from(await res.arrayBuffer()), mime: "audio/mpeg" };
  }
}

export function getTTS(): TextToSpeech {
  return config.tts.provider === "elevenlabs" ? new ElevenLabsTTS() : new OpenAITTS();
}
