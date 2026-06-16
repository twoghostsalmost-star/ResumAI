"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";

export default function SettingsPage() {
  const { ready, authed } = useRequireAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<null | "export" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.me,
    enabled: ready && authed,
  });

  async function exportData() {
    setBusy("export");
    setError(null);
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resumeforge-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete your account and all resumes? This cannot be undone.")) return;
    setBusy("delete");
    setError(null);
    try {
      await api.deleteAccount();
      signOut();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
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
      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem", maxWidth: 720 }}>
        <h1 className="title-xl" style={{ marginBottom: "1.5rem" }}>
          Settings
        </h1>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 className="section-title">Account</h3>
          {isLoading ? (
            <span className="spinner" />
          ) : (
            <div className="muted">
              <div>
                <strong>Name:</strong> {me?.name || "—"}
              </div>
              <div>
                <strong>Email:</strong> {me?.email}
              </div>
              <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                ID: {me?.id}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 className="section-title">Your data</h3>
          <p className="muted">Download a JSON copy of your account and resumes.</p>
          <button className="btn" onClick={exportData} disabled={busy !== null}>
            {busy === "export" ? <span className="spinner" /> : "Export my data"}
          </button>
        </div>

        <div
          className="card"
          style={{ borderColor: "color-mix(in srgb, var(--bad) 40%, transparent)" }}
        >
          <h3 className="section-title" style={{ color: "var(--bad)" }}>
            Danger zone
          </h3>
          <p className="muted">
            Permanently delete your account and all associated resumes.
          </p>
          <button className="btn danger" onClick={deleteAccount} disabled={busy !== null}>
            {busy === "delete" ? <span className="spinner" /> : "Delete account"}
          </button>
        </div>
      </main>
    </>
  );
}
