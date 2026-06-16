"use client";

import type { CSSProperties } from "react";
import type { Resume, ResumeSection } from "@resumeforge/shared";
import { formatDateRange } from "@/lib/format";

const MARGIN_PX: Record<Resume["design"]["margins"], number> = {
  tight: 32,
  normal: 48,
  roomy: 64,
};

const SECTION_TITLES: Record<string, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
};

function SectionBody({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "experience":
      return (
        <>
          {section.items.map((it) => (
            <div className="rp-item" key={it.id}>
              <div className="rp-item-head">
                <div>
                  <span className="rp-item-title">{it.role || "Role"}</span>
                  {it.company ? (
                    <span className="rp-item-sub"> · {it.company}</span>
                  ) : null}
                  {it.location ? (
                    <span className="rp-item-sub"> · {it.location}</span>
                  ) : null}
                </div>
                <span className="rp-dates">
                  {formatDateRange(it.startDate, it.endDate)}
                </span>
              </div>
              {it.bullets.length > 0 && (
                <ul>
                  {it.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      );
    case "education":
      return (
        <>
          {section.items.map((it) => (
            <div className="rp-item" key={it.id}>
              <div className="rp-item-head">
                <div>
                  <span className="rp-item-title">{it.institution}</span>
                  {it.degree || it.field ? (
                    <span className="rp-item-sub">
                      {" · "}
                      {[it.degree, it.field].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </div>
                <span className="rp-dates">
                  {formatDateRange(it.startDate, it.endDate)}
                </span>
              </div>
              {it.details.length > 0 && (
                <ul>
                  {it.details.filter(Boolean).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      );
    case "skills":
      return (
        <>
          {section.groups.map((g, i) => (
            <div className="rp-item" key={i}>
              {g.name ? <span className="rp-item-title">{g.name}: </span> : null}
              <span>{g.skills.filter(Boolean).join(", ")}</span>
            </div>
          ))}
        </>
      );
    case "projects":
      return (
        <>
          {section.items.map((it) => (
            <div className="rp-item" key={it.id}>
              <div className="rp-item-head">
                <span className="rp-item-title">{it.name}</span>
                {it.url ? <span className="rp-dates">{it.url}</span> : null}
              </div>
              {it.bullets.length > 0 && (
                <ul>
                  {it.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      );
    case "certifications":
      return (
        <>
          {section.items.map((it) => (
            <div className="rp-item" key={it.id}>
              <div className="rp-item-head">
                <div>
                  <span className="rp-item-title">{it.name}</span>
                  {it.issuer ? (
                    <span className="rp-item-sub"> · {it.issuer}</span>
                  ) : null}
                </div>
                {it.date ? <span className="rp-dates">{it.date}</span> : null}
              </div>
            </div>
          ))}
        </>
      );
    case "custom":
      return (
        <>
          {section.items.map((it) => (
            <div className="rp-item" key={it.id}>
              {it.text}
            </div>
          ))}
        </>
      );
  }
}

function sectionTitle(section: ResumeSection): string {
  if (section.type === "custom") return section.heading || "Section";
  return SECTION_TITLES[section.type] ?? section.type;
}

export function ResumePreview({ resume }: { resume: Resume }) {
  const { design, basics } = resume;
  const contactBits = [
    basics.email,
    basics.phone,
    basics.location,
    ...basics.links.map((l) => l.url),
  ].filter(Boolean);

  const style = {
    "--rp-accent": design.accentColor,
    "--rp-font": `"${design.fontFamily}", Helvetica, Arial, sans-serif`,
    "--rp-scale": String(design.fontScale),
    "--rp-margin": `${MARGIN_PX[design.margins]}px`,
  } as CSSProperties;

  return (
    <div className="resume-preview">
      <div className={`resume-page tmpl-${design.template}`} style={style}>
        <h1>{basics.fullName || "Your Name"}</h1>
        {basics.headline ? (
          <div className="rp-headline">{basics.headline}</div>
        ) : null}
        {contactBits.length > 0 ? (
          <div className="rp-contact">{contactBits.join("  •  ")}</div>
        ) : null}

        {basics.summary ? (
          <div className="rp-section">
            <div className="rp-section-title">Summary</div>
            <div>{basics.summary}</div>
          </div>
        ) : null}

        {resume.sections.map((section) => (
          <div className="rp-section" key={section.id}>
            <div className="rp-section-title">{sectionTitle(section)}</div>
            <SectionBody section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}
