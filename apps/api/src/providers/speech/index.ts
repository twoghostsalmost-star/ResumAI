export interface Transcript {
  text: string;
}

export interface SpeechToText {
  transcribe(audio: Buffer, mime: string): Promise<Transcript>;
}

export interface TextToSpeech {
  speak(text: string): Promise<{ audio: Buffer; mime: string }>;
}
