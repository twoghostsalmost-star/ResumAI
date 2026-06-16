"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";

export default function NewResumePage() {
  const { ready, authed } = useRequireAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<null | "scratch" | "linkedin">(null);
  const [error, setError] = useState<string | null>(null);
  const [linkedinFallback, setLinkedinFallback] = useState(false);

  async function createScratch() {
    setBusy("scratch");
    setError(null);
    try {
      const resume = await api.createResume({ title: "Untitled Resume", source: "scratch" });
      router.replace(`/resume/${resume.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create resume");
      setBusy(null);
    }
  }

  async function startLinkedIn() {
    setBusy("linkedin");
    setError(null);
    setLinkedinFallback(false);
    try {
      const { url } = await api.linkedinAuthUrl();
      window.open(url, "_blank", "noopener,noreferrer");
      setBusy(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 501) {
        setLinkedinFallback(true);
      } else {
        setError(err instanceof Error ? err.message : "LinkedIn import unavailable");
      }
      setBusy(null);
    }
  }

  if (!ready || !authed) {
    return (
      <>
        <AppBar />
        <div className="center-screen">
          <span className="spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppBar />
      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem", maxWidth: 820 }}>
        <Link className="btn ghost sm" href="/dashboard">
          ← Back
        </Link>
        <h1 className="title-xl" style={{ margin: "1rem 0 0.5rem" }}>
          Start a new resume
        </h1>
        <p className="muted">Choose how you want to begin.</p>

        {error ? <div className="error-banner">{error}</div> : null}
        {linkedinFallback ? (
          <div className="error-banner" style={{ color: "var(--warn)", borderColor: "var(--warn)", background: "color-mix(in srgb, var(--warn) 12%, transparent)" }}>
            LinkedIn import isn&apos;t available yet. In LinkedIn, open your
            profile → <strong>More → Save to PDF</strong>, then{" "}
            <Link href="/import" style={{ textDecoration: "underline" }}>
              upload that PDF here
            </Link>
            .
          </div>
        ) : null}

        <div className="choice-grid" style={{ marginTop: "1.5rem" }}>
          <button className="choice" onClick={createScratch} disabled={busy !== null}>
            <div className="emoji">✏️</div>
            <h3>Build from scratch</h3>
            <p className="muted" style={{ margin: 0 }}>
              Start with a blank, ATS-friendly template and fill it in.
            </p>
            {busy === "scratch" ? <span className="spinner" style={{ marginTop: 8 }} /> : null}
          </button>

          <Link className="choice" href="/import">
            <div className="emoji">📤</div>
            <h3>Upload a resume</h3>
            <p className="muted" style={{ margin: 0 }}>
              Import a PDF/DOCX or paste text — we&apos;ll parse it for you.
            </p>
          </Link>

          <button className="choice" onClick={startLinkedIn} disabled={busy !== null}>
            <div className="emoji">in</div>
            <h3>Import from LinkedIn</h3>
            <p className="muted" style={{ margin: 0 }}>
              Connect LinkedIn to pull your profile automatically.
            </p>
            {busy === "linkedin" ? <span className="spinner" style={{ marginTop: 8 }} /> : null}
          </button>
        </div>
      </main>
    </>
  );
}
