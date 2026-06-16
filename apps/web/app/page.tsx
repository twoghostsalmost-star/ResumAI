"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken, setStoredUser } from "@/lib/auth";
import { useAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";

type Mode = "login" | "register";

export default function LandingPage() {
  const router = useRouter();
  const { ready, authed } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && authed) router.replace("/dashboard");
  }, [ready, authed, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "register"
          ? await api.register(email.trim(), password, name.trim() || undefined)
          : await api.login(email.trim(), password);
      setToken(res.token);
      setStoredUser(res.user);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Incorrect email or password.");
      } else if (err instanceof ApiError && err.status === 409) {
        setError("That email is already registered. Try signing in instead.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("Password must be at least 8 characters.");
      } else {
        setError("Something went wrong. Is the API reachable?");
      }
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
              <h2 className="section-title">
                {mode === "register" ? "Create your account" : "Sign in"}
              </h2>
              <p className="faint" style={{ marginTop: "-0.4rem", fontSize: "0.85rem" }}>
                {mode === "register"
                  ? "Sign up with your email and a password."
                  : "Welcome back — sign in with your email and password."}
              </p>
              {error ? <div className="error-banner">{error}</div> : null}

              <form onSubmit={onSubmit}>
                {mode === "register" ? (
                  <div className="field">
                    <label className="label">Name</label>
                    <input
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                    />
                  </div>
                ) : null}
                <div className="field">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="field">
                  <label className="label">Password</label>
                  <input
                    type="password"
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                  />
                </div>
                <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%" }}>
                  {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
                </button>
              </form>

              <p className="faint" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
                {mode === "register" ? "Already have an account? " : "Don’t have an account? "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setError(null);
                    setMode(mode === "register" ? "login" : "register");
                  }}
                >
                  {mode === "register" ? "Sign in" : "Create one"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
