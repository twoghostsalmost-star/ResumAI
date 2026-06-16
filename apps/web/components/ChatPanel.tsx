"use client";

import { useRef, useState } from "react";
import type { ResumePatch } from "@resumeforge/shared";
import { api } from "@/lib/api";
import { useResumeStore } from "@/lib/store";

type Msg = {
  role: "user" | "assistant";
  text: string;
  patches?: ResumePatch[];
  applied?: boolean;
};

export function ChatPanel({ resumeId }: { resumeId: string }) {
  const acceptPatches = useResumeStore((s) => s.acceptPatches);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Hi! I can help rewrite bullets, tailor your resume to a job description, or fix issues. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setSending(true);
    scrollDown();
    try {
      const res = await api.assistant(resumeId, text);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.reply, patches: res.patches?.length ? res.patches : undefined },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assistant failed");
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Sorry, I couldn't process that request." },
      ]);
    } finally {
      setSending(false);
      scrollDown();
    }
  }

  async function apply(idx: number, patches: ResumePatch[]) {
    setApplyingIdx(idx);
    setError(null);
    try {
      await acceptPatches(patches);
      setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, applied: true } : msg)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply changes");
    } finally {
      setApplyingIdx(null);
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="chat-thread" ref={threadRef} style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.text}
            {m.patches && !m.applied ? (
              <div style={{ marginTop: "0.6rem" }}>
                <button
                  className="btn sm primary"
                  disabled={applyingIdx === i}
                  onClick={() => apply(i, m.patches!)}
                >
                  {applyingIdx === i ? (
                    <span className="spinner" />
                  ) : (
                    `Apply ${m.patches.length} change${m.patches.length === 1 ? "" : "s"}`
                  )}
                </button>
              </div>
            ) : null}
            {m.applied ? (
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", opacity: 0.8 }}>
                ✓ Applied
              </div>
            ) : null}
          </div>
        ))}
        {sending ? (
          <div className="chat-msg assistant">
            <span className="spinner" />
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <textarea
          rows={2}
          placeholder="Ask the assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn primary" disabled={sending || !input.trim()} onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
