"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken, setStoredUser } from "@/lib/auth";

/**
 * Landing spot for social sign-in. The API redirects here with the freshly
 * minted session token in the URL fragment (#token=...&id=...&email=...), which
 * never reaches the server. We store it client-side and head to the dashboard.
 */
export default function AuthFinishPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = params.get("token");
    const id = params.get("id");
    const email = params.get("email");
    if (token && id && email) {
      setToken(token);
      setStoredUser({ id, email, name: params.get("name") });
      // Drop the fragment from history before moving on.
      window.history.replaceState(null, "", window.location.pathname);
      router.replace("/dashboard");
    } else {
      setError(true);
    }
  }, [router]);

  return (
    <main className="container" style={{ paddingTop: "5rem", textAlign: "center" }}>
      {error ? (
        <div className="card glass" style={{ maxWidth: 420, margin: "0 auto" }}>
          <h2 className="section-title">Sign-in didn’t complete</h2>
          <p className="muted">The link was missing its session token.</p>
          <button className="btn primary" onClick={() => router.replace("/")}>
            Back to sign in
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <span className="spinner" />
          <p className="muted">Signing you in…</p>
        </div>
      )}
    </main>
  );
}
