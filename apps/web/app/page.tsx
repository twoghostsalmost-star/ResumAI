"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, setStoredUser } from "@/lib/auth";
import { useAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";

export default function LandingPage() {
  const router = useRouter();
  const { ready, authed } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && authed) router.replace("/dashboard");
  }, [ready, authed, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.createSession(email.trim(), name.trim() || undefined);
      setToken(res.token);
      setStoredUser(res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `Sign-in failed (${err.status}). Check the API URL and try again.`
          : "Sign-in failed. Is the API running?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar />
      <main className="container" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
        <div
          style={{
            display: "grid",
            gap: "2.5rem",
            gridTemplateColumns: "1fr",
            alignItems: "center",
          }}
        >
          <section>
            <span className="pill">ATS-ready resumes</span>
            <h1 className="title-xl" style={{ marginTop: "1rem", fontSize: "2.8rem" }}>
              Forge a resume that beats the bots.
            </h1>
            <p className="muted" style={{ fontSize: "1.1rem", maxWidth: 560 }}>
              Build from scratch, import an existing PDF, or pull from LinkedIn.
              Score against applicant tracking systems, get AI fixes, and export
              to PDF or DOCX.
            </p>

            <div className="card" style={{ maxWidth: 440, marginTop: "1.75rem" }}>
              <h2 className="section-title">Sign in</h2>
              <p className="faint" style={{ marginTop: "-0.4rem", fontSize: "0.85rem" }}>
                Passwordless — enter your email to continue.
              </p>
              {error ? <div className="error-banner">{error}</div> : null}
              <form onSubmit={onSubmit}>
                <div className="field">
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="name">
                    Name (optional)
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <button className="btn primary" type="submit" disabled={busy}>
                  {busy ? <span className="spinner" /> : "Continue"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
