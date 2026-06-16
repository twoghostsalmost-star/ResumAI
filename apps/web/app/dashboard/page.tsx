"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ResumeListItem } from "@/lib/api";
import { useRequireAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";
import { formatRelative, scoreColor } from "@/lib/format";

export default function DashboardPage() {
  const { ready, authed } = useRequireAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["resumes"],
    queryFn: api.listResumes,
    enabled: ready && authed,
  });

  const del = useMutation({
    mutationFn: (id: string) => api.deleteResume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });

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
      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h1 className="title-xl">Your resumes</h1>
          <Link className="btn primary" href="/new">
            + New resume
          </Link>
        </div>

        {error ? (
          <div className="error-banner">
            Could not load resumes. {(error as Error).message}
          </div>
        ) : null}

        {isLoading ? (
          <div className="center-screen">
            <span className="spinner" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2.5rem" }}>📄</div>
            <h2 className="section-title" style={{ marginTop: "0.75rem" }}>
              No resumes yet
            </h2>
            <p className="muted">Create your first resume to get started.</p>
            <Link className="btn primary" href="/new" style={{ marginTop: "0.5rem" }}>
              Create a resume
            </Link>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {data.map((r) => (
              <ResumeCard key={r.id} item={r} onDelete={() => del.mutate(r.id)} deleting={del.isPending} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ResumeCard({
  item,
  onDelete,
  deleting,
}: {
  item: ResumeListItem;
  onDelete: () => void;
  deleting: boolean;
}) {
  const overall = item.atsScore?.overall;
  return (
    <div className="card hoverable" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Link href={`/resume/${item.id}`} style={{ display: "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{item.title || "Untitled"}</h3>
          {typeof overall === "number" ? (
            <span
              className="pill"
              style={{ color: scoreColor(overall), borderColor: scoreColor(overall) }}
            >
              ATS {Math.round(overall)}
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="pill">{item.source}</span>
          <span className="faint" style={{ fontSize: "0.8rem" }}>
            Updated {formatRelative(item.updatedAt)}
          </span>
        </div>
      </Link>
      <div className="inline-actions" style={{ justifyContent: "flex-end", marginTop: "auto" }}>
        <Link className="btn sm" href={`/resume/${item.id}`}>
          Open
        </Link>
        <button
          className="btn sm danger"
          disabled={deleting}
          onClick={() => {
            if (confirm(`Delete "${item.title}"? This cannot be undone.`)) onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
