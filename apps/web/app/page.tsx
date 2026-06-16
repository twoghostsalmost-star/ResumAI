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

  // Surface OAuth failures the API bounced back via ?authError=...
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("authError");
    if (!code) return;
    setError(
      code.endsWith("not_configured")
        ? "That sign-in method isn’t configured yet. Set its provider credentials and try again."
        : "Social sign-in failed. Please try again.",
    );
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

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

              <div className="divider"><span>or</span></div>

              <div className="social-row">
                <a className="btn social" href={api.googleSignInUrl}>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
                  </svg>
                  Continue with Google
                </a>
                <a className="btn social" href={api.appleSignInUrl}>
                  <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true" fill="currentColor">
                    <path d="M13.07 9.54c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.43.73-3.06.73-.63 0-1.6-.71-2.64-.69-1.36.02-2.61.79-3.31 2C-.6 9.4.45 13.06 1.85 15.07c.7.98 1.53 2.08 2.61 2.04 1.05-.04 1.45-.68 2.71-.68 1.27 0 1.62.68 2.73.66 1.13-.02 1.84-1 2.53-1.98.8-1.14 1.13-2.24 1.15-2.3-.03-.01-2.2-.84-2.22-3.34zM11.03 3.3c.57-.7.96-1.66.85-2.62-.82.03-1.83.55-2.43 1.24-.53.61-1 1.6-.88 2.54.92.07 1.86-.47 2.46-1.16z" />
                  </svg>
                  Continue with Apple
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
