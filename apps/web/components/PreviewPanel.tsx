"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useResumeStore } from "@/lib/store";
import { ResumePreview } from "./ResumePreview";

export function PreviewPanel({ resumeId }: { resumeId: string }) {
  const resume = useResumeStore((s) => s.resume);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!resume) return null;

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function share() {
    setSharing(true);
    setError(null);
    try {
      const res = await api.share(resumeId);
      setShareUrl(res.url);
      try {
        await navigator.clipboard.writeText(res.url);
        notify("Share link copied to clipboard");
      } catch {
        notify("Share link created");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create share link");
    } finally {
      setSharing(false);
    }
  }

  function openExport(format: "pdf" | "docx") {
    window.open(api.exportUrl(resumeId, format), "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      {error ? <div className="error-banner">{error}</div> : null}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <button className="btn" onClick={() => openExport("pdf")}>
          ⬇ Export PDF
        </button>
        <button className="btn" onClick={() => openExport("docx")}>
          ⬇ Export DOCX
        </button>
        <button className="btn" onClick={share} disabled={sharing}>
          {sharing ? <span className="spinner" /> : "🔗 Share"}
        </button>
        {shareUrl ? (
          <a
            className="btn ghost sm"
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {shareUrl}
          </a>
        ) : null}
      </div>

      <ResumePreview resume={resume} />
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
