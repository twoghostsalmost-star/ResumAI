"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Resume } from "@resumeforge/shared";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";
import { ResumePreview } from "@/components/ResumePreview";

type ParsedState = {
  resume: Resume;
  lowConfidenceFields: string[];
  method: string;
};

export default function ImportPage() {
  const { ready, authed } = useRequireAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [parsed, setParsed] = useState<ParsedState | null>(null);

  async function runText() {
    if (!text.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await api.parseText(text.trim());
      setParsed(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse text");
    } finally {
      setParsing(false);
    }
  }

  async function runUpload(file: File) {
    setParsing(true);
    setError(null);
    try {
      const res = await api.parseUpload(file);
      setParsed(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  }

  async function confirmCreate() {
    if (!parsed) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.createResume({
        title: parsed.resume.title || "Imported Resume",
        source: "upload",
        data: parsed.resume,
      });
      router.replace(`/resume/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create resume");
      setCreating(false);
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

  if (parsed) {
    return (
      <>
        <AppBar />
        <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
          <button className="btn ghost sm" onClick={() => setParsed(null)}>
            ← Re-parse
          </button>
          <h1 className="title-xl" style={{ margin: "1rem 0 0.25rem" }}>
            Review your import
          </h1>
          <p className="muted">
            Parsed via <strong>{parsed.method}</strong>. Highlighted fields had low
            confidence — please double-check them.
          </p>
          {error ? <div className="error-banner">{error}</div> : null}

          <div className="editor-split">
            <div>
              <ReviewForm
                resume={parsed.resume}
                lowConfidence={parsed.lowConfidenceFields}
                onChange={(r) => setParsed({ ...parsed, resume: r })}
              />
            </div>
            <div className="sticky-preview">
              <h3 className="section-title">Preview</h3>
              <ResumePreview resume={parsed.resume} />
              <button
                className="btn primary"
                style={{ marginTop: "1rem", width: "100%" }}
                disabled={creating}
                onClick={confirmCreate}
              >
                {creating ? <span className="spinner" /> : "Looks good — create resume"}
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppBar />
      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem", maxWidth: 820 }}>
        <Link className="btn ghost sm" href="/new">
          ← Back
        </Link>
        <h1 className="title-xl" style={{ margin: "1rem 0 0.5rem" }}>
          Import a resume
        </h1>
        <p className="muted">Upload a file or paste the text of your resume.</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 className="section-title">Upload a file</h3>
          <div
            className={`dropzone${drag ? " drag" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) runUpload(f);
            }}
          >
            {parsing ? (
              <span className="spinner" />
            ) : (
              <>
                <div style={{ fontSize: "1.8rem" }}>📎</div>
                <div>Drag &amp; drop a PDF or DOCX here, or click to browse</div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runUpload(f);
              }}
            />
          </div>
        </div>

        <div className="card" style={{ marginTop: "1rem" }}>
          <h3 className="section-title">Or paste text</h3>
          <textarea
            rows={10}
            placeholder="Paste your resume text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn primary"
            style={{ marginTop: "0.75rem" }}
            disabled={parsing || !text.trim()}
            onClick={runText}
          >
            {parsing ? <span className="spinner" /> : "Parse text"}
          </button>
        </div>
      </main>
    </>
  );
}

/** Lightweight review form for the most important parsed fields. */
function ReviewForm({
  resume,
  lowConfidence,
  onChange,
}: {
  resume: Resume;
  lowConfidence: string[];
  onChange: (r: Resume) => void;
}) {
  const low = (path: string) => lowConfidence.includes(path);

  function setBasics<K extends keyof Resume["basics"]>(key: K, value: Resume["basics"][K]) {
    onChange({ ...resume, basics: { ...resume.basics, [key]: value } });
  }

  return (
    <div className="card">
      <h3 className="section-title">Basics</h3>
      <div className="field">
        <label className="label">Title</label>
        <input
          className={low("title") ? "lowconf" : ""}
          value={resume.title}
          onChange={(e) => onChange({ ...resume, title: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="label">Full name</label>
        <input
          className={low("basics.fullName") ? "lowconf" : ""}
          value={resume.basics.fullName}
          onChange={(e) => setBasics("fullName", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">Headline</label>
        <input
          className={low("basics.headline") ? "lowconf" : ""}
          value={resume.basics.headline ?? ""}
          onChange={(e) => setBasics("headline", e.target.value)}
        />
      </div>
      <div className="row">
        <div className="field">
          <label className="label">Email</label>
          <input
            className={low("basics.email") ? "lowconf" : ""}
            value={resume.basics.email ?? ""}
            onChange={(e) => setBasics("email", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label">Phone</label>
          <input
            className={low("basics.phone") ? "lowconf" : ""}
            value={resume.basics.phone ?? ""}
            onChange={(e) => setBasics("phone", e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label className="label">Location</label>
        <input
          className={low("basics.location") ? "lowconf" : ""}
          value={resume.basics.location ?? ""}
          onChange={(e) => setBasics("location", e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">Summary</label>
        <textarea
          className={low("basics.summary") ? "lowconf" : ""}
          value={resume.basics.summary ?? ""}
          onChange={(e) => setBasics("summary", e.target.value)}
        />
      </div>
      <p className="faint" style={{ fontSize: "0.82rem" }}>
        {resume.sections.length} section(s) detected. You can refine everything in
        the full editor after creating the resume.
      </p>
    </div>
  );
}
