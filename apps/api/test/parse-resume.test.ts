import { describe, it, expect } from "vitest";
import { heuristicParse } from "../src/pipeline/parse-resume.js";
import { renderResumeHtml } from "../src/pipeline/export-html.js";
import { ResumeSchema } from "@resumeforge/shared";

const SAMPLE = `Jane Q. Engineer
jane.engineer@example.com | (555) 123-4567 | linkedin.com/in/jane

Experience
Senior Software Engineer   Acme Corp   2021 - present
- Led migration that reduced infra cost by 35%
- Built a service handling 2M requests/day
Software Engineer   Globex   2018 - 2021
- Shipped the billing rewrite

Education
BS Computer Science, MIT

Skills
TypeScript, React, Node.js, PostgreSQL, AWS
`;

describe("heuristicParse", () => {
  it("extracts contact info, experience, education and skills from raw text", () => {
    const { resume, method } = heuristicParse(SAMPLE, "u1");
    expect(method).toBe("heuristic");
    expect(resume.basics.email).toBe("jane.engineer@example.com");
    expect(resume.basics.phone).toBeTruthy();

    const exp = resume.sections.find((s) => s.type === "experience");
    expect(exp && exp.type === "experience" && exp.items.length).toBeGreaterThanOrEqual(1);

    const skills = resume.sections.find((s) => s.type === "skills");
    expect(skills && skills.type === "skills" && skills.groups[0].skills).toContain("TypeScript");
  });

  it("always returns a schema-valid resume", () => {
    const { resume } = heuristicParse(SAMPLE, "u1");
    expect(() => ResumeSchema.parse(resume)).not.toThrow();
  });

  it("flags low-confidence fields for the review screen", () => {
    const { lowConfidenceFields } = heuristicParse("only@example.com\n- a bullet with no header", "u1");
    expect(lowConfidenceFields).toContain("basics.fullName");
  });
});

describe("renderResumeHtml", () => {
  it("produces selectable-text HTML with the candidate name and a bullet", () => {
    const { resume } = heuristicParse(SAMPLE, "u1");
    const html = renderResumeHtml(resume);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Jane Q. Engineer");
    expect(html).toContain("<li>");
    // No rasterization: the content is real text, not an <img> or <canvas>.
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("<img");
  });

  it("escapes HTML-significant characters to avoid broken markup", () => {
    const base = heuristicParse(SAMPLE, "u1").resume;
    base.basics.fullName = "A & B <Test>";
    const html = renderResumeHtml(base);
    expect(html).toContain("A &amp; B &lt;Test&gt;");
  });
});
