"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/lib/useAuthGate";

export function AppBar() {
  const router = useRouter();
  const { authed, user } = useAuth();

  return (
    <header className="appbar">
      <Link href={authed ? "/dashboard" : "/"} className="brand">
        <span className="dot" />
        ResumeForge
      </Link>
      <div className="spacer" />
      {authed ? (
        <nav>
          <Link className="btn ghost sm" href="/dashboard">
            Resumes
          </Link>
          <Link className="btn ghost sm" href="/settings">
            Settings
          </Link>
          <span className="faint" style={{ fontSize: "0.8rem" }}>
            {user?.email}
          </span>
          <button
            className="btn sm"
            onClick={() => {
              signOut();
              router.replace("/");
            }}
          >
            Sign out
          </button>
        </nav>
      ) : null}
    </header>
  );
}
