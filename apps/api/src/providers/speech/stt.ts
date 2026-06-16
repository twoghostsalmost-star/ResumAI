import { SpeechToText, Transcript } from "./index.js";
import { config } from "../../config.js";

/** Deepgram pre-recorded transcription (streaming variant used in the live path). */
class DeepgramSTT implements SpeechToText {
  async transcribe(audio: Buffer, mime: string): Promise<Transcript> {
    if (!config.stt.apiKey) throw new Error("STT_API_KEY is not configured");
    const res = await fetch("https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2", {
      method: "POST",
      headers: { Authorization: `Token ${config.stt.apiKey}`, "content-type": mime || "audio/wav" },
      body: new Uint8Array(audio),
    });
    if (!res.ok) throw new Error(`Deepgram error ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return { text: data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "" };
  }
}

/** OpenAI Whisper batch transcription. */
class WhisperSTT implements SpeechToText {
  async transcribe(audio: Buffer, mime: string): Promise<Transcript> {
    if (!config.stt.apiKey) throw new Error("STT_API_KEY is not configured");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio)], { type: mime || "audio/wav" }), "audio.wav");
    form.append("model", "whisper-1");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.stt.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Whisper error ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    return { text: data?.text ?? "" };
  }
}

export function getSTT(): SpeechToText {
  return config.stt.provider === "whisper" ? new WhisperSTT() : new DeepgramSTT();
}
