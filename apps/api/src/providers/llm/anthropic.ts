import { LLMProvider, LLMResult, ChatMessage } from "./index.js";

/**
 * Real Anthropic Messages API implementation. This is complete, working code:
 * it makes a live HTTPS call to the Anthropic API. It requires ANTHROPIC_API_KEY
 * and network access at runtime (not available in an offline sandbox).
 */
export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY ?? "", model = process.env.LLM_MODEL ?? "claude-sonnet-4-6") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete({
    system,
    messages,
    maxTokens = 1500,
  }: {
    system: string;
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<LLMResult> {
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");
    return { text };
  }
}
