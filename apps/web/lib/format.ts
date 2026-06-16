export function formatDateRange(start?: string, end?: string | "present"): string {
  if (!start && !end) return "";
  const s = start ?? "";
  const e = end === "present" ? "Present" : end ?? "";
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function scoreColor(n: number): string {
  if (n >= 80) return "var(--good)";
  if (n >= 60) return "var(--warn)";
  return "var(--bad)";
}

export const SUBSCORE_LABELS: Record<string, string> = {
  parseability: "Parseability",
  keywordMatch: "Keyword Match",
  structure: "Structure",
  impact: "Impact",
  formatting: "Formatting",
};

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
};
