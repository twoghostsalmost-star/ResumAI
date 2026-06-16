"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useResumeStore } from "@/lib/store";
import { useRequireAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";
import { Tabs, type TabDef } from "@/components/Tabs";
import { PreviewPanel } from "@/components/PreviewPanel";
import { ResumePreview } from "@/components/ResumePreview";
import { ContentEditor } from "@/components/ContentEditor";
import { ChatPanel } from "@/components/ChatPanel";
import { AtsPanel } from "@/components/AtsPanel";

type TabKey = "preview" | "content" | "assistant" | "ats";

const TABS: TabDef<TabKey>[] = [
  { key: "preview", label: "Preview" },
  { key: "content", label: "Content" },
  { key: "assistant", label: "Assistant" },
  { key: "ats", label: "ATS" },
];

export default function ResumeEditorPage() {
  const { ready, authed } = useRequireAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey =
    tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : "content";

  const resume = useResumeStore((s) => s.resume);
  const loading = useResumeStore((s) => s.loading);
  const saving = useResumeStore((s) => s.saving);
  const dirty = useResumeStore((s) => s.dirty);
  const error = useResumeStore((s) => s.error);
  const load = useResumeStore((s) => s.load);
  const save = useResumeStore((s) => s.save);
  const clear = useResumeStore((s) => s.clear);

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load resume on mount / id change
  useEffect(() => {
    if (ready && authed && id) load(id);
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authed, id]);

  // Debounced autosave when dirty
  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await save();
      setLastSavedAt(Date.now());
    }, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, save, resume]);

  function setTab(tab: TabKey) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", tab);
    router.replace(`/resume/${id}?${sp.toString()}`, { scroll: false });
  }

  if (!ready || !authed || (loading && !resume)) {
    return (
      <>
        <AppBar />
        <div className="center-screen">
          <span className="spinner" />
        </div>
      </>
    );
  }

  if (error && !resume) {
    return (
      <>
        <AppBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="error-banner">Could not load this resume. {error}</div>
          <Link className="btn" href="/dashboard">
            ← Back to dashboard
          </Link>
        </main>
      </>
    );
  }

  if (!resume) return null;

  return (
    <>
      <AppBar />
      <main className="container" style={{ paddingTop: "1.5rem", paddingBottom: "4rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <Link className="btn ghost sm" href="/dashboard">
            ← Resumes
          </Link>
          <h1 style={{ margin: 0, fontSize: "1.5rem", flex: 1, minWidth: 200 }}>
            {resume.title || "Untitled"}
          </h1>
          <SaveStatus saving={saving} dirty={dirty} lastSavedAt={lastSavedAt} />
          <button className="btn sm" onClick={() => save()} disabled={saving || !dirty}>
            Save now
          </button>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <Tabs tabs={TABS} active={activeTab} onChange={setTab} />
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {activeTab === "preview" && <PreviewPanel resumeId={id} />}
        {activeTab === "content" && (
          <div className="editor-split">
            <ContentEditor />
            <div className="sticky-preview">
              <h3 className="section-title">Live preview</h3>
              <PreviewLite />
            </div>
          </div>
        )}
        {activeTab === "assistant" && <ChatPanel resumeId={id} />}
        {activeTab === "ats" && <AtsPanel resumeId={id} />}
      </main>
    </>
  );
}

function PreviewLite() {
  // Reuse the full preview component for live editing feedback.
  const resume = useResumeStore((s) => s.resume);
  if (!resume) return null;
  return <ResumePreview resume={resume} />;
}

function SaveStatus({
  saving,
  dirty,
  lastSavedAt,
}: {
  saving: boolean;
  dirty: boolean;
  lastSavedAt: number | null;
}) {
  let text = "All changes saved";
  if (saving) text = "Saving…";
  else if (dirty) text = "Unsaved changes";
  else if (lastSavedAt) text = "Saved";
  return (
    <span className="faint" style={{ fontSize: "0.82rem", display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
      {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : null}
      {text}
    </span>
  );
}
