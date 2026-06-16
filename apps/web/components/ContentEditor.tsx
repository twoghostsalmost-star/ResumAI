"use client";

import { useState } from "react";
import { ATS_SAFE_FONTS } from "@resumeforge/shared";
import type { Resume, ResumeSection } from "@resumeforge/shared";
import { useResumeStore } from "@/lib/store";
import { SectionEditor } from "./SectionEditor";
import { makeSection, SECTION_TYPE_LABELS, type SectionType } from "@/lib/sections";

export function ContentEditor() {
  const resume = useResumeStore((s) => s.resume);
  const update = useResumeStore((s) => s.update);
  const [newType, setNewType] = useState<SectionType>("experience");

  if (!resume) return null;

  function setBasics<K extends keyof Resume["basics"]>(key: K, value: Resume["basics"][K]) {
    update((r) => ({ ...r, basics: { ...r.basics, [key]: value } }));
  }

  function setSection(index: number, next: ResumeSection) {
    update((r) => ({
      ...r,
      sections: r.sections.map((s, i) => (i === index ? next : s)),
    }));
  }

  function moveSection(index: number, dir: -1 | 1) {
    const j = index + dir;
    update((r) => {
      if (j < 0 || j >= r.sections.length) return r;
      const next = [...r.sections];
      [next[index], next[j]] = [next[j], next[index]];
      return { ...r, sections: next };
    });
  }

  function removeSection(index: number) {
    update((r) => ({ ...r, sections: r.sections.filter((_, i) => i !== index) }));
  }

  function addSection() {
    update((r) => ({ ...r, sections: [...r.sections, makeSection(newType)] }));
  }

  return (
    <div>
      {/* Document */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">Document</h3>
        <div className="field">
          <label className="label">Resume title</label>
          <input value={resume.title} onChange={(e) => update((r) => ({ ...r, title: e.target.value }))} />
        </div>
        <div className="row">
          <div className="field">
            <label className="label">Target role</label>
            <input
              value={resume.targetRole ?? ""}
              onChange={(e) => update((r) => ({ ...r, targetRole: e.target.value || undefined }))}
            />
          </div>
        </div>
        <div className="field">
          <label className="label">Target job description</label>
          <textarea
            rows={4}
            placeholder="Paste the JD to improve keyword matching…"
            value={resume.targetJobDescription ?? ""}
            onChange={(e) =>
              update((r) => ({ ...r, targetJobDescription: e.target.value || undefined }))
            }
          />
        </div>
      </div>

      {/* Basics */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">Basics</h3>
        <div className="row">
          <div className="field">
            <label className="label">Full name</label>
            <input value={resume.basics.fullName} onChange={(e) => setBasics("fullName", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Headline</label>
            <input value={resume.basics.headline ?? ""} onChange={(e) => setBasics("headline", e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label className="label">Email</label>
            <input value={resume.basics.email ?? ""} onChange={(e) => setBasics("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Phone</label>
            <input value={resume.basics.phone ?? ""} onChange={(e) => setBasics("phone", e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Location</label>
            <input value={resume.basics.location ?? ""} onChange={(e) => setBasics("location", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="label">Summary</label>
          <textarea
            rows={3}
            value={resume.basics.summary ?? ""}
            onChange={(e) => setBasics("summary", e.target.value)}
          />
        </div>

        {/* Links */}
        <label className="label">Links</label>
        {resume.basics.links.map((link, i) => (
          <div className="row" key={i} style={{ marginBottom: "0.5rem" }}>
            <input
              placeholder="Label"
              value={link.label}
              onChange={(e) =>
                setBasics(
                  "links",
                  resume.basics.links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)),
                )
              }
            />
            <input
              placeholder="https://…"
              value={link.url}
              onChange={(e) =>
                setBasics(
                  "links",
                  resume.basics.links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)),
                )
              }
            />
            <button
              className="btn iconbtn danger"
              style={{ flex: "0 0 auto" }}
              onClick={() =>
                setBasics(
                  "links",
                  resume.basics.links.filter((_, j) => j !== i),
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className="btn sm"
          onClick={() => setBasics("links", [...resume.basics.links, { label: "", url: "" }])}
        >
          + Add link
        </button>
      </div>

      {/* Sections */}
      <h3 className="section-title">Sections</h3>
      {resume.sections.map((section, i) => (
        <SectionEditor
          key={section.id}
          section={section}
          index={i}
          total={resume.sections.length}
          onChange={(next) => setSection(i, next)}
          onMove={(dir) => moveSection(i, dir)}
          onRemove={() => removeSection(i)}
        />
      ))}

      <div className="card" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label className="label">Add a section</label>
          <select value={newType} onChange={(e) => setNewType(e.target.value as SectionType)}>
            {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map((t) => (
              <option key={t} value={t}>
                {SECTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn primary" onClick={addSection}>
          + Add section
        </button>
      </div>

      {/* Design */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3 className="section-title">Design</h3>
        <div className="row">
          <div className="field">
            <label className="label">Template</label>
            <select
              value={resume.design.template}
              onChange={(e) =>
                update((r) => ({
                  ...r,
                  design: { ...r.design, template: e.target.value as Resume["design"]["template"] },
                }))
              }
            >
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Font</label>
            <select
              value={resume.design.fontFamily}
              onChange={(e) =>
                update((r) => ({ ...r, design: { ...r.design, fontFamily: e.target.value } }))
              }
            >
              {ATS_SAFE_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label className="label">Accent color</label>
            <input
              type="color"
              value={resume.design.accentColor}
              onChange={(e) =>
                update((r) => ({ ...r, design: { ...r.design, accentColor: e.target.value } }))
              }
              style={{ height: 42, padding: 4 }}
            />
          </div>
          <div className="field">
            <label className="label">Margins</label>
            <select
              value={resume.design.margins}
              onChange={(e) =>
                update((r) => ({
                  ...r,
                  design: { ...r.design, margins: e.target.value as Resume["design"]["margins"] },
                }))
              }
            >
              <option value="tight">Tight</option>
              <option value="normal">Normal</option>
              <option value="roomy">Roomy</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="label">Font scale — {resume.design.fontScale.toFixed(2)}×</label>
          <input
            type="range"
            min={0.8}
            max={1.3}
            step={0.05}
            value={resume.design.fontScale}
            onChange={(e) =>
              update((r) => ({ ...r, design: { ...r.design, fontScale: Number(e.target.value) } }))
            }
          />
        </div>
      </div>
    </div>
  );
}
