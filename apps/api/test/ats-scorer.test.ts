import { describe, it, expect } from "vitest";
import { ResumeSchema, ATS_SCORER_VERSION } from "@resumeforge/shared";
import { scoreResume } from "../src/pipeline/ats-scorer.js";

const now = new Date().toISOString();

function makeResume(overrides: any = {}) {
  return ResumeSchema.parse({
    id: "r1",
    userId: "u1",
    title: "Test",
    basics: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      summary: "Senior engineer with 8 years of experience.",
      links: [],
    },
    sections: [
      {
        id: "s1",
        type: "experience",
        items: [
          {
            id: "e1",
            company: "Acme",
            role: "Engineer",
            startDate: "2020-01",
            endDate: "present",
            bullets: ["Led a team that increased revenue by 30%", "Built a service handling 1M requests/day"],
          },
        ],
      },
      { id: "s2", type: "skills", groups: [{ skills: ["TypeScript", "React"] }] },
      { id: "s3", type: "education", items: [{ id: "ed1", institution: "MIT", degree: "BS" }] },
    ],
    design: {},
    source: "scratch",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe("scoreResume", () => {
  it("is deterministic for fixed input and reports the version", () => {
    const r = makeResume();
    const a = scoreResume(r);
    const b = scoreResume(r);
    expect(a.overall).toBe(b.overall);
    expect(a.version).toBe(ATS_SCORER_VERSION);
  });

  it("flags a missing email as a critical parseability finding", () => {
    const r = makeResume({
      basics: { fullName: "Jane Doe", phone: "555", links: [], summary: "x" },
    });
    const res = scoreResume(r);
    const critical = res.findings.find((f) => f.area === "parseability" && f.severity === "critical");
    expect(critical).toBeTruthy();
    expect(res.subscores.parseability).toBeLessThan(100);
  });

  it("rewards quantified, strong-verb bullets with a high impact score", () => {
    const res = scoreResume(makeResume());
    expect(res.subscores.impact).toBeGreaterThan(60);
  });

  it("penalises a resume with no experience section in structure", () => {
    const r = makeResume({ sections: [] });
    const res = scoreResume(r);
    expect(res.subscores.structure).toBeLessThan(80);
    expect(res.findings.some((f) => f.area === "structure" && f.severity === "critical")).toBe(true);
  });
});
