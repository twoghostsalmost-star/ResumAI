export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface LLMResult {
  text: string;
}

export interface LLMProvider {
  /** A plain chat completion. systemPrompt is provider-handled. */
  complete(args: { system: string; messages: ChatMessage[]; maxTokens?: number }): Promise<LLMResult>;
}
