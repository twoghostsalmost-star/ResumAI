"use client";

import { useState } from "react";
import type { AtsScoreResult, AtsFinding } from "@resumeforge/shared";
import { api } from "@/lib/api";
import { useResumeStore } from "@/lib/store";
import { AtsGauge, ScoreBar } from "./AtsGauge";
import { SUBSCORE_LABELS, SEVERITY_ORDER } from "@/lib/format";

export function AtsPanel({ resumeId }: { resumeId: string }) {
  const resume = useResumeStore((s) => s.resume);
  const setResume = useResumeStore((s) => s.setResume);
  const acceptPatches = useResumeStore((s) => s.acceptPatches);

  // `atsScore` is attached at runtime by the API but not part of the zod Resume type.
  const initialScore =
    (resume as { atsScore?: AtsScoreResult | null } | null)?.atsScore ?? null;
  const [score, setScore] = useState<AtsScoreResult | null>(initialScore);
  const [running, setRunning] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await api.score(resumeId);
      setScore(res);
      // refresh resume so atsScore is reflected elsewhere
      const fresh = await api.getResume(resumeId);
      setResume(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setRunning(false);
    }
  }

  async function applyFix(finding: AtsFinding) {
    if (!finding.fix?.autoApplyPatch?.length) return;
    setFixingId(finding.id);
    setError(null);
    try {
      await acceptPatches(finding.fix.autoApplyPatch);
      const res = await api.score(resumeId);
      setScore(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply fix");
    } finally {
      setFixingId(null);
    }
  }

  const findings = score
    ? [...score.findings].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      )
    : [];

  return (
    <div>
      {error ? <div className="error-banner">{error}</div> : null}

      {!score ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "2.5rem" }}>🎯</div>
          <h3 className="section-title" style={{ marginTop: "0.75rem" }}>
            Run an ATS scan
          </h3>
          <p className="muted">
            Check how applicant tracking systems will read your resume and get
            actionable fixes.
          </p>
          <button className="btn primary" onClick={run} disabled={running}>
            {running ? <span className="spinner" /> : "Run ATS scan"}
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <AtsGauge value={score.overall} />
              <div style={{ flex: 1, minWidth: 220 }}>
                {(Object.keys(SUBSCORE_LABELS) as (keyof typeof score.subscores)[]).map(
                  (k) => (
                    <ScoreBar key={k} label={SUBSCORE_LABELS[k]} value={score.subscores[k]} />
                  ),
                )}
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="faint" style={{ fontSize: "0.8rem" }}>
                Scorer v{score.version}
              </span>
              <button className="btn sm" onClick={run} disabled={running}>
                {running ? <span className="spinner" /> : "Re-run scan"}
              </button>
            </div>
          </div>

          <h3 className="section-title">
            Findings {findings.length ? `(${findings.length})` : ""}
          </h3>
          {findings.length === 0 ? (
            <div className="card">No findings — your resume looks great!</div>
          ) : (
            findings.map((f) => (
              <div key={f.id} className={`finding ${f.severity}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong style={{ textTransform: "capitalize" }}>{f.severity}</strong>
                  <span className="pill">{SUBSCORE_LABELS[f.area]}</span>
                </div>
                <p style={{ margin: "0.4rem 0" }}>{f.message}</p>
                {f.fix ? (
                  <div className="faint" style={{ fontSize: "0.85rem" }}>
                    Fix: {f.fix.description}
                  </div>
                ) : null}
                {f.fix?.autoApplyPatch?.length ? (
                  <button
                    className="btn sm primary"
                    style={{ marginTop: "0.5rem" }}
                    disabled={fixingId === f.id}
                    onClick={() => applyFix(f)}
                  >
                    {fixingId === f.id ? <span className="spinner" /> : "Apply fix"}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
