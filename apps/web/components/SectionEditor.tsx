"use client";

import type {
  Resume,
  ResumeSection,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  CertItem,
} from "@resumeforge/shared";
import { uid } from "@/lib/ids";

type SetSection = (next: ResumeSection) => void;

function Header({
  title,
  onUp,
  onDown,
  onRemove,
  canUp,
  canDown,
}: {
  title: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="item-head">
      <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{title}</h3>
      <div className="inline-actions">
        <button className="btn iconbtn" disabled={!canUp} onClick={onUp} title="Move up">
          ↑
        </button>
        <button className="btn iconbtn" disabled={!canDown} onClick={onDown} title="Move down">
          ↓
        </button>
        <button className="btn iconbtn danger" onClick={onRemove} title="Remove section">
          ✕
        </button>
      </div>
    </div>
  );
}

function BulletList({
  bullets,
  onChange,
  label = "Bullets",
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
  label?: string;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {bullets.map((b, i) => (
        <div className="bullet-row" key={i}>
          <textarea
            rows={2}
            value={b}
            onChange={(e) => {
              const next = [...bullets];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <div className="inline-actions" style={{ flexDirection: "column" }}>
            <button
              className="btn iconbtn"
              disabled={i === 0}
              onClick={() => {
                const next = [...bullets];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              ↑
            </button>
            <button
              className="btn iconbtn danger"
              onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button className="btn sm" onClick={() => onChange([...bullets, ""])}>
        + Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
}

function moveItem<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[idx], next[j]] = [next[j], next[idx]];
  return next;
}

export function SectionEditor({
  section,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  section: ResumeSection;
  index: number;
  total: number;
  onChange: SetSection;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const titles: Record<string, string> = {
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    custom: section.type === "custom" ? section.heading || "Custom Section" : "Custom",
  };

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <Header
        title={titles[section.type]}
        onUp={() => onMove(-1)}
        onDown={() => onMove(1)}
        onRemove={onRemove}
        canUp={index > 0}
        canDown={index < total - 1}
      />

      {section.type === "custom" ? (
        <div className="field">
          <label className="label">Heading</label>
          <input
            value={section.heading}
            onChange={(e) => onChange({ ...section, heading: e.target.value })}
          />
        </div>
      ) : null}

      {section.type === "experience" && (
        <ExperienceEditor section={section} onChange={onChange} />
      )}
      {section.type === "education" && (
        <EducationEditor section={section} onChange={onChange} />
      )}
      {section.type === "skills" && <SkillsEditor section={section} onChange={onChange} />}
      {section.type === "projects" && <ProjectsEditor section={section} onChange={onChange} />}
      {section.type === "certifications" && (
        <CertEditor section={section} onChange={onChange} />
      )}
      {section.type === "custom" && <CustomEditor section={section} onChange={onChange} />}
    </div>
  );
}

function ItemControls({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="inline-actions">
      <button className="btn iconbtn" disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button
        className="btn iconbtn"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
      <button className="btn iconbtn danger" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

function ExperienceEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: "experience" }>;
  onChange: SetSection;
}) {
  const set = (items: ExperienceItem[]) => onChange({ ...section, items });
  return (
    <>
      {section.items.map((it, i) => (
        <div className="item-card" key={it.id}>
          <div className="item-head">
            <strong className="muted">Position {i + 1}</strong>
            <ItemControls
              index={i}
              total={section.items.length}
              onMove={(d) => set(moveItem(section.items, i, d))}
              onRemove={() => set(section.items.filter((_, j) => j !== i))}
            />
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Role</label>
              <input
                value={it.role}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">Company</label>
              <input
                value={it.company}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, company: e.target.value } : x)))
                }
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Location</label>
              <input
                value={it.location ?? ""}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">Start (YYYY-MM)</label>
              <input
                value={it.startDate}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, startDate: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">End (YYYY-MM / present)</label>
              <input
                value={it.endDate ?? ""}
                onChange={(e) =>
                  set(
                    section.items.map((x, j) =>
                      j === i ? { ...x, endDate: e.target.value || undefined } : x,
                    ),
                  )
                }
              />
            </div>
          </div>
          <BulletList
            bullets={it.bullets}
            onChange={(b) =>
              set(section.items.map((x, j) => (j === i ? { ...x, bullets: b } : x)))
            }
          />
        </div>
      ))}
      <button
        className="btn sm"
        onClick={() =>
          set([
            ...section.items,
            { id: uid("exp"), company: "", role: "", startDate: "", bullets: [] },
          ])
        }
      >
        + Add position
      </button>
    </>
  );
}

function EducationEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: "education" }>;
  onChange: SetSection;
}) {
  const set = (items: EducationItem[]) => onChange({ ...section, items });
  return (
    <>
      {section.items.map((it, i) => (
        <div className="item-card" key={it.id}>
          <div className="item-head">
            <strong className="muted">Education {i + 1}</strong>
            <ItemControls
              index={i}
              total={section.items.length}
              onMove={(d) => set(moveItem(section.items, i, d))}
              onRemove={() => set(section.items.filter((_, j) => j !== i))}
            />
          </div>
          <div className="field">
            <label className="label">Institution</label>
            <input
              value={it.institution}
              onChange={(e) =>
                set(section.items.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)))
              }
            />
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Degree</label>
              <input
                value={it.degree ?? ""}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">Field</label>
              <input
                value={it.field ?? ""}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))
                }
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Start</label>
              <input
                value={it.startDate ?? ""}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, startDate: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">End</label>
              <input
                value={it.endDate ?? ""}
                onChange={(e) =>
                  set(
                    section.items.map((x, j) =>
                      j === i ? { ...x, endDate: e.target.value || undefined } : x,
                    ),
                  )
                }
              />
            </div>
          </div>
          <BulletList
            label="Details"
            bullets={it.details}
            onChange={(b) =>
              set(section.items.map((x, j) => (j === i ? { ...x, details: b } : x)))
            }
          />
        </div>
      ))}
      <button
        className="btn sm"
        onClick={() =>
          set([...section.items, { id: uid("edu"), institution: "", details: [] }])
        }
      >
        + Add education
      </button>
    </>
  );
}

function SkillsEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: "skills" }>;
  onChange: SetSection;
}) {
  const set = (groups: typeof section.groups) => onChange({ ...section, groups });
  return (
    <>
      {section.groups.map((g, i) => (
        <div className="item-card" key={i}>
          <div className="item-head">
            <strong className="muted">Group {i + 1}</strong>
            <ItemControls
              index={i}
              total={section.groups.length}
              onMove={(d) => set(moveItem(section.groups, i, d))}
              onRemove={() => set(section.groups.filter((_, j) => j !== i))}
            />
          </div>
          <div className="field">
            <label className="label">Group name (optional)</label>
            <input
              value={g.name ?? ""}
              onChange={(e) =>
                set(section.groups.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
            />
          </div>
          <div className="field">
            <label className="label">Skills (comma separated)</label>
            <input
              value={g.skills.join(", ")}
              onChange={(e) =>
                set(
                  section.groups.map((x, j) =>
                    j === i
                      ? { ...x, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
                      : x,
                  ),
                )
              }
            />
          </div>
        </div>
      ))}
      <button className="btn sm" onClick={() => set([...section.groups, { skills: [] }])}>
        + Add group
      </button>
    </>
  );
}

function ProjectsEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: "projects" }>;
  onChange: SetSection;
}) {
  const set = (items: ProjectItem[]) => onChange({ ...section, items });
  return (
    <>
      {section.items.map((it, i) => (
        <div className="item-card" key={it.id}>
          <div className="item-head">
            <strong className="muted">Project {i + 1}</strong>
            <ItemControls
              index={i}
              total={section.items.length}
              onMove={(d) => set(moveItem(section.items, i, d))}
              onRemove={() => set(section.items.filter((_, j) => j !== i))}
            />
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Name</label>
              <input
                value={it.name}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">URL</label>
              <input
                value={it.url ?? ""}
                onChange={(e) =>
                  set(
                    section.items.map((x, j) =>
                      j === i ? { ...x, url: e.target.value || undefined } : x,
                    ),
                  )
                }
              />
            </div>
          </div>
          <BulletList
            bullets={it.bullets}
            onChange={(b) =>
              set(section.items.map((x, j) => (j === i ? { ...x, bullets: b } : x)))
            }
          />
        </div>
      ))}
      <button
        className="btn sm"
        onClick={() => set([...section.items, { id: uid("proj"), name: "", bullets: [] }])}
      >
        + Add project
      </button>
    </>
  );
}

function CertEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: "certifications" }>;
  onChange: SetSection;
}) {
  const set = (items: CertItem[]) => onChange({ ...section, items });
  return (
    <>
      {section.items.map((it, i) => (
        <div className="item-card" key={it.id}>
          <div className="item-head">
            <strong className="muted">Certification {i + 1}</strong>
            <ItemControls
              index={i}
              total={section.items.length}
              onMove={(d) => set(moveItem(section.items, i, d))}
              onRemove={() => set(section.items.filter((_, j) => j !== i))}
            />
          </div>
          <div className="row">
            <div className="field">
              <label className="label">Name</label>
              <input
                value={it.name}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">Issuer</label>
              <input
                value={it.issuer ?? ""}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, issuer: e.target.value } : x)))
                }
              />
            </div>
            <div className="field">
              <label className="label">Date</label>
              <input
                value={it.date ?? ""}
                onChange={(e) =>
                  set(section.items.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))
                }
              />
            </div>
          </div>
        </div>
      ))}
      <button
        className="btn sm"
        onClick={() => set([...section.items, { id: uid("cert"), name: "" }])}
      >
        + Add certification
      </button>
    </>
  );
}

function CustomEditor({
  section,
  onChange,
}: {
  section: Extract<ResumeSection, { type: "custom" }>;
  onChange: SetSection;
}) {
  const set = (items: typeof section.items) => onChange({ ...section, items });
  return (
    <>
      {section.items.map((it, i) => (
        <div className="bullet-row" key={it.id}>
          <textarea
            rows={2}
            value={it.text}
            onChange={(e) =>
              set(section.items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
            }
          />
          <button
            className="btn iconbtn danger"
            onClick={() => set(section.items.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        className="btn sm"
        onClick={() => set([...section.items, { id: uid("line"), text: "" }])}
      >
        + Add line
      </button>
    </>
  );
}
