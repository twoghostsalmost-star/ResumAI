"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Descope } from "@descope/nextjs-sdk";
import { api } from "@/lib/api";
import { setToken, setStoredUser } from "@/lib/auth";
import { useAuth } from "@/lib/useAuthGate";
import { AppBar } from "@/components/AppBar";

export default function LandingPage() {
  const router = useRouter();
  const { ready, authed } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && authed) router.replace("/dashboard");
  }, [ready, authed, router]);

  // Descope ran the flow (email / Google / Apple, all configured in its console)
  // and handed us a session JWT. Exchange it for the app's own token so every
  // API route keeps working unchanged.
  async function handleSuccess(e: CustomEvent) {
    setError(null);
    const detail = e.detail as { sessionJwt?: string };
    const sessionJwt = detail?.sessionJwt;
    if (!sessionJwt) {
      setError("Sign-in didn’t return a session. Please try again.");
      return;
    }
    try {
      const res = await api.exchangeDescope(sessionJwt);
      setToken(res.token);
      setStoredUser(res.user);
      router.replace("/dashboard");
    } catch {
      setError("Couldn’t complete sign-in. Is the API reachable and Descope configured?");
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
                Continue with email, Google, or Apple.
              </p>
              {error ? <div className="error-banner">{error}</div> : null}
              <Descope
                flowId="sign-up-or-in"
                onSuccess={handleSuccess}
                onError={() => setError("Sign-in failed. Please try again.")}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
