import {
  Resume,
  ResumeSection,
  AtsScoreResult,
  AtsFinding,
  AtsSubscores,
  ATS_WEIGHTS,
  ATS_SCORER_VERSION,
  ATS_SAFE_FONTS,
} from "@resumeforge/shared";

/**
 * Deterministic ATS scorer. Pure function of the resume (and optional job
 * description). No network, no LLM — fully reproducible for a given input and
 * version. The conversation engine may *augment* findings with LLM judgment,
 * but this baseline stands on its own.
 */

const STRONG_VERBS = new Set([
  "led","built","launched","designed","developed","created","drove","delivered",
  "increased","reduced","improved","grew","shipped","architected","owned","scaled",
  "automated","optimized","managed","spearheaded","implemented","negotiated","cut",
  "accelerated","streamlined","mentored","founded","generated","saved","won",
]);

const WEAK_OPENERS = new Set([
  "responsible","worked","helped","assisted","participated","involved","tasked",
  "duties","handled","various","supported",
]);

const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","for","with","on","at","by","from","as",
  "is","are","be","this","that","you","your","we","our","will","a","experience",
  "and/or","etc","including","strong","ability","work","team","role","skills",
]);

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function getExperience(resume: Resume) {
  const sec = resume.sections.find((s) => s.type === "experience");
  return sec && sec.type === "experience" ? sec.items : [];
}

function allBullets(resume: Resume): string[] {
  const out: string[] = [];
  for (const s of resume.sections) {
    if (s.type === "experience") s.items.forEach((i) => out.push(...i.bullets));
    else if (s.type === "projects") s.items.forEach((i) => out.push(...i.bullets));
    else if (s.type === "custom") s.items.forEach((i) => out.push(i.text));
    else if (s.type === "education") s.items.forEach((i) => out.push(...i.details));
  }
  return out.filter((b) => b.trim().length > 0);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Parseability ────────────────────────────────────────────────────────────
function scoreParseability(resume: Resume): { score: number; findings: AtsFinding[] } {
  const findings: AtsFinding[] = [];
  let score = 100;

  if (!ATS_SAFE_FONTS.includes(resume.design.fontFamily as any)) {
    score -= 15;
    findings.push({
      id: id("parse"),
      severity: "warning",
      area: "parseability",
      message: `Font "${resume.design.fontFamily}" may not embed cleanly in ATS parsers. Use an ATS-safe font.`,
      fix: {
        description: "Switch to Helvetica.",
        autoApplyPatch: [{ op: "set", path: "design.fontFamily", value: "Helvetica" }],
      },
    });
  }

  if (!resume.basics.email) {
    score -= 20;
    findings.push({
      id: id("parse"),
      severity: "critical",
      area: "parseability",
      message: "No email address found. ATS systems key off a parseable email in the contact block.",
    });
  }
  if (!resume.basics.phone) {
    score -= 8;
    findings.push({
      id: id("parse"),
      severity: "warning",
      area: "parseability",
      message: "No phone number found in the contact block.",
    });
  }

  // Date parseability in experience
  const exp = getExperience(resume);
  const dateRe = /^\d{4}(-\d{2})?$/;
  for (const item of exp) {
    const okStart = dateRe.test(item.startDate);
    const okEnd = !item.endDate || item.endDate === "present" || dateRe.test(item.endDate);
    if (!okStart || !okEnd) {
      score -= 6;
      findings.push({
        id: id("parse"),
        severity: "warning",
        area: "parseability",
        message: `Dates for "${item.role} @ ${item.company}" aren't in a machine-parseable format (use YYYY or YYYY-MM).`,
      });
    }
  }

  return { score: clampScore(score), findings };
}

// ── Keyword match ───────────────────────────────────────────────────────────
function scoreKeywordMatch(resume: Resume): { score: number; findings: AtsFinding[] } {
  const findings: AtsFinding[] = [];
  const jd = resume.targetJobDescription?.trim();
  if (!jd) {
    // No JD to match against — neutral, with a suggestion.
    findings.push({
      id: id("kw"),
      severity: "suggestion",
      area: "keywordMatch",
      message: "Add a target job description to get keyword-match analysis tuned to a specific role.",
    });
    return { score: 70, findings };
  }

  const jdTokens = tokenize(jd);
  const freq = new Map<string, number>();
  for (const t of jdTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  // Top keywords by frequency, ignoring very common ones already in stopwords.
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map((e) => e[0]);

  const resumeText = new Set(
    tokenize([
      resume.basics.summary ?? "",
      resume.basics.headline ?? "",
      ...allBullets(resume),
      ...resume.sections
        .filter((s): s is Extract<ResumeSection, { type: "skills" }> => s.type === "skills")
        .flatMap((s) => s.groups.flatMap((g) => g.skills)),
    ].join(" "))
  );

  const matched = ranked.filter((k) => resumeText.has(k));
  const missing = ranked.filter((k) => !resumeText.has(k));
  const score = ranked.length === 0 ? 70 : (matched.length / ranked.length) * 100;

  if (missing.length > 0) {
    findings.push({
      id: id("kw"),
      severity: missing.length > ranked.length / 2 ? "critical" : "warning",
      area: "keywordMatch",
      message: `Missing ${missing.length} high-value keywords from the job description: ${missing.slice(0, 8).join(", ")}.`,
      fix: { description: "Weave the missing keywords into your summary and experience bullets where truthful." },
    });
  }

  return { score: clampScore(score), findings };
}

// ── Structure ───────────────────────────────────────────────────────────────
function scoreStructure(resume: Resume): { score: number; findings: AtsFinding[] } {
  const findings: AtsFinding[] = [];
  let score = 100;
  const types = resume.sections.map((s) => s.type);

  if (!types.includes("experience")) {
    score -= 30;
    findings.push({
      id: id("struct"),
      severity: "critical",
      area: "structure",
      message: "No experience section. Most ATS pipelines expect a clearly labelled work-experience section.",
    });
  }
  if (!types.includes("education")) {
    score -= 10;
    findings.push({
      id: id("struct"),
      severity: "warning",
      area: "structure",
      message: "No education section found.",
    });
  }
  if (!types.includes("skills")) {
    score -= 10;
    findings.push({
      id: id("struct"),
      severity: "warning",
      area: "structure",
      message: "No skills section — skills sections are heavily weighted by keyword-matching ATS.",
    });
  }

  // Ordering: for experienced candidates, experience should precede education.
  const expIdx = types.indexOf("experience");
  const eduIdx = types.indexOf("education");
  const exp = getExperience(resume);
  if (expIdx > -1 && eduIdx > -1 && eduIdx < expIdx && exp.length >= 2) {
    score -= 8;
    findings.push({
      id: id("struct"),
      severity: "suggestion",
      area: "structure",
      message: "Education appears before experience. For candidates with multiple roles, lead with experience.",
      fix: {
        description: "Move the experience section above education.",
        autoApplyPatch: [{ op: "move", path: "sections", from: expIdx, to: eduIdx }],
      },
    });
  }

  return { score: clampScore(score), findings };
}

// ── Impact ──────────────────────────────────────────────────────────────────
function scoreImpact(resume: Resume): { score: number; findings: AtsFinding[] } {
  const findings: AtsFinding[] = [];
  const bullets = allBullets(resume);
  if (bullets.length === 0) {
    return {
      score: 0,
      findings: [{
        id: id("impact"),
        severity: "critical",
        area: "impact",
        message: "No achievement bullets found. Add bullets describing outcomes, not just duties.",
      }],
    };
  }

  let strongVerb = 0;
  let quantified = 0;
  let weak = 0;
  const numRe = /\d|%|\$|\b(thousand|million|k\b)/i;

  for (const b of bullets) {
    const first = b.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";
    if (STRONG_VERBS.has(first)) strongVerb++;
    if (WEAK_OPENERS.has(first)) weak++;
    if (numRe.test(b)) quantified++;
  }

  const strongPct = strongVerb / bullets.length;
  const quantPct = quantified / bullets.length;
  const weakPct = weak / bullets.length;

  let score = strongPct * 45 + quantPct * 45 + (1 - weakPct) * 10;
  score = clampScore(score);

  if (quantPct < 0.4) {
    findings.push({
      id: id("impact"),
      severity: "warning",
      area: "impact",
      message: `Only ${Math.round(quantPct * 100)}% of bullets are quantified. Add numbers (%, $, time saved, scale) to show impact.`,
    });
  }
  if (weak > 0) {
    findings.push({
      id: id("impact"),
      severity: "suggestion",
      area: "impact",
      message: `${weak} bullet(s) start with weak phrasing ("responsible for", "worked on"). Lead with a strong action verb.`,
    });
  }
  return { score, findings };
}

// ── Formatting ──────────────────────────────────────────────────────────────
function scoreFormatting(resume: Resume): { score: number; findings: AtsFinding[] } {
  const findings: AtsFinding[] = [];
  let score = 100;
  const bullets = allBullets(resume);

  // Rough length estimate: ~45 bullets ≈ a packed 2 pages.
  const exp = getExperience(resume).length;
  const estimatedLines = bullets.length + exp * 2 + resume.sections.length * 2;
  if (estimatedLines > 90) {
    score -= 15;
    findings.push({
      id: id("fmt"),
      severity: "warning",
      area: "formatting",
      message: "Resume looks long (likely 3+ pages). Aim for 1 page early-career, 2 pages max.",
    });
  }

  const longBullets = bullets.filter((b) => b.split(/\s+/).length > 35).length;
  if (longBullets > 0) {
    score -= Math.min(20, longBullets * 5);
    findings.push({
      id: id("fmt"),
      severity: "suggestion",
      area: "formatting",
      message: `${longBullets} bullet(s) exceed ~35 words. Tighten to one clear idea per bullet.`,
    });
  }

  if (!resume.basics.summary) {
    score -= 6;
    findings.push({
      id: id("fmt"),
      severity: "suggestion",
      area: "formatting",
      message: "No professional summary. A 2–3 line summary helps both ATS keyword density and human reviewers.",
    });
  }

  return { score: clampScore(score), findings };
}

export function scoreResume(resume: Resume): AtsScoreResult {
  const parse = scoreParseability(resume);
  const kw = scoreKeywordMatch(resume);
  const struct = scoreStructure(resume);
  const impact = scoreImpact(resume);
  const fmt = scoreFormatting(resume);

  const subscores: AtsSubscores = {
    parseability: parse.score,
    keywordMatch: kw.score,
    structure: struct.score,
    impact: impact.score,
    formatting: fmt.score,
  };

  const overall = clampScore(
    subscores.parseability * ATS_WEIGHTS.parseability +
      subscores.keywordMatch * ATS_WEIGHTS.keywordMatch +
      subscores.structure * ATS_WEIGHTS.structure +
      subscores.impact * ATS_WEIGHTS.impact +
      subscores.formatting * ATS_WEIGHTS.formatting
  );

  const severityRank = { critical: 0, warning: 1, suggestion: 2 };
  const findings = [...parse.findings, ...kw.findings, ...struct.findings, ...impact.findings, ...fmt.findings].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity]
  );

  return { overall, subscores, findings, version: ATS_SCORER_VERSION };
}
