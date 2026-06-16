import { Resume, ResumeSection } from "@resumeforge/shared";

/**
 * Renders a Resume to semantic, ATS-safe HTML. Single column, real headings,
 * real text (no canvas/raster). This HTML is what the backend feeds to
 * Playwright's page.pdf() to produce a tagged PDF with extractable text.
 *
 * This is complete, working code with no external dependencies.
 */

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d?: string): string {
  if (!d) return "";
  if (d === "present") return "Present";
  const [y, m] = d.split("-");
  if (!m) return y;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mi = parseInt(m, 10) - 1;
  return months[mi] ? `${months[mi]} ${y}` : y;
}

function dateRange(start?: string, end?: string): string {
  const s = fmtDate(start);
  const e = end ? fmtDate(end) : "";
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

const MARGIN_MAP = { tight: "0.5in", normal: "0.75in", roomy: "1in" } as const;

function renderSection(section: ResumeSection): string {
  switch (section.type) {
    case "experience":
      return `<section><h2>Experience</h2>${section.items
        .map(
          (i) => `
        <article class="entry">
          <div class="entry-head">
            <span class="role">${esc(i.role)}</span>
            <span class="dates">${esc(dateRange(i.startDate, i.endDate))}</span>
          </div>
          <div class="org">${esc(i.company)}${i.location ? ` · ${esc(i.location)}` : ""}</div>
          <ul>${i.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        </article>`
        )
        .join("")}</section>`;

    case "education":
      return `<section><h2>Education</h2>${section.items
        .map(
          (i) => `
        <article class="entry">
          <div class="entry-head">
            <span class="role">${esc(i.degree ?? "")}${i.field ? `, ${esc(i.field)}` : ""}</span>
            <span class="dates">${esc(dateRange(i.startDate, i.endDate))}</span>
          </div>
          <div class="org">${esc(i.institution)}${i.location ? ` · ${esc(i.location)}` : ""}</div>
          ${i.details.length ? `<ul>${i.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
        </article>`
        )
        .join("")}</section>`;

    case "skills":
      return `<section><h2>Skills</h2>${section.groups
        .map(
          (g) =>
            `<p class="skills">${g.name ? `<strong>${esc(g.name)}:</strong> ` : ""}${g.skills
              .map(esc)
              .join(", ")}</p>`
        )
        .join("")}</section>`;

    case "projects":
      return `<section><h2>Projects</h2>${section.items
        .map(
          (i) => `
        <article class="entry">
          <div class="entry-head">
            <span class="role">${esc(i.name)}</span>
            ${i.url ? `<span class="dates">${esc(i.url)}</span>` : ""}
          </div>
          <ul>${i.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        </article>`
        )
        .join("")}</section>`;

    case "certifications":
      return `<section><h2>Certifications</h2><ul>${section.items
        .map(
          (i) =>
            `<li>${esc(i.name)}${i.issuer ? ` — ${esc(i.issuer)}` : ""}${i.date ? ` (${esc(i.date)})` : ""}</li>`
        )
        .join("")}</ul></section>`;

    case "custom":
      return `<section><h2>${esc(section.heading)}</h2><ul>${section.items
        .map((i) => `<li>${esc(i.text)}</li>`)
        .join("")}</ul></section>`;
  }
}

export function renderResumeHtml(resume: Resume): string {
  const { basics, design } = resume;
  const margin = MARGIN_MAP[design.margins];
  const contact = [
    basics.email,
    basics.phone,
    basics.location,
    ...basics.links.map((l) => l.url),
  ]
    .filter(Boolean)
    .map(esc)
    .join("  ·  ");

  const accent = esc(design.accentColor);
  const font = esc(design.fontFamily);
  const scale = design.fontScale;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @page { size: Letter; margin: ${margin}; }
  * { box-sizing: border-box; }
  body { font-family: "${font}", Arial, sans-serif; color: #1a1a1a; font-size: ${10.5 * scale}pt; line-height: 1.4; margin: 0; }
  header { margin-bottom: 14px; border-bottom: 2px solid ${accent}; padding-bottom: 8px; }
  h1 { font-size: ${20 * scale}pt; margin: 0 0 2px; color: ${accent}; }
  .headline { font-size: ${11 * scale}pt; color: #444; margin: 0 0 6px; }
  .contact { font-size: ${9 * scale}pt; color: #333; }
  h2 { font-size: ${11.5 * scale}pt; text-transform: uppercase; letter-spacing: 0.04em; color: ${accent};
       border-bottom: 1px solid #ddd; padding-bottom: 2px; margin: 14px 0 6px; }
  .summary { margin: 0 0 4px; }
  .entry { margin-bottom: 10px; }
  .entry-head { display: flex; justify-content: space-between; gap: 12px; }
  .role { font-weight: 700; }
  .org { color: #444; font-size: ${10 * scale}pt; margin-bottom: 2px; }
  .dates { color: #555; font-size: ${9.5 * scale}pt; white-space: nowrap; }
  ul { margin: 4px 0 0; padding-left: 16px; }
  li { margin-bottom: 2px; }
  .skills { margin: 2px 0; }
  section { page-break-inside: auto; }
  .entry { page-break-inside: avoid; }
</style>
</head>
<body>
  <header>
    <h1>${esc(basics.fullName)}</h1>
    ${basics.headline ? `<p class="headline">${esc(basics.headline)}</p>` : ""}
    <div class="contact">${contact}</div>
  </header>
  ${basics.summary ? `<section><h2>Summary</h2><p class="summary">${esc(basics.summary)}</p></section>` : ""}
  ${resume.sections.map(renderSection).join("\n")}
</body>
</html>`;
}
