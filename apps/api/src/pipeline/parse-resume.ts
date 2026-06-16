import { randomUUID } from "node:crypto";
import { Resume, ResumeSchema, ResumeSection } from "@resumeforge/shared";
import { AnthropicProvider } from "../providers/llm/anthropic.js";
import { hasAnthropic } from "../config.js";

export type ParseResult = {
  resume: Resume;
  lowConfidenceFields: string[]; // dot-paths the review screen should highlight
  method: "llm" | "heuristic";
};

/** Extract raw text from an uploaded buffer based on mime/extension. */
export async function extractText(buf: Buffer, mime: string, filename = ""): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (mime.includes("pdf") || ext === "pdf") {
    try {
      const mod: any = await import("pdf-parse");
      const pdfParse = mod.default ?? mod;
      const data = await pdfParse(buf);
      return data.text ?? "";
    } catch {
      // Fall through to raw decode if pdf-parse isn't installed.
    }
  }
  if (mime.includes("word") || ext === "docx") {
    try {
      const mammoth: any = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return value ?? "";
    } catch {
      // Fall through.
    }
  }
  return buf.toString("utf8");
}

const SECTION_HEADINGS: Record<string, ResumeSection["type"]> = {
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "projects",
  certifications: "certifications",
  certs: "certifications",
};

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((https?:\/\/)?(www\.)?[\w-]+\.[a-z]{2,}(\/[^\s]*)?)/i;
const DATE_RANGE_RE =
  /((?:\d{4})|(?:[A-Za-z]{3,9}\s+\d{4}))\s*[-–—to]+\s*((?:present|current)|(?:\d{4})|(?:[A-Za-z]{3,9}\s+\d{4}))/i;

function normalizeDate(s: string): string {
  const t = s.trim().toLowerCase();
  if (t === "present" || t === "current") return "present";
  const ym = t.match(/^(\d{4})$/);
  if (ym) return ym[1];
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const m = t.match(/([a-z]{3,9})\s+(\d{4})/);
  if (m) {
    const mm = months[m[1].slice(0, 3)];
    if (mm) return `${m[2]}-${mm}`;
  }
  return s.trim();
}

/**
 * Heuristic resume parser — pure TS, no network. Splits text into known
 * sections by heading, pulls contact info from the header, and turns bullet
 * lines into achievement bullets. Good enough to land the user on the review
 * screen; the LLM path produces cleaner structure when a key is configured.
 */
export function heuristicParse(text: string, userId: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const low: string[] = [];

  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0]?.trim();
  const fullName = nonEmpty[0] && !EMAIL_RE.test(nonEmpty[0]) ? nonEmpty[0] : "";
  if (!fullName) low.push("basics.fullName");

  const links: { label: string; url: string }[] = [];
  const urlMatch = text.match(URL_RE);
  if (urlMatch) {
    const raw = urlMatch[1];
    const url = raw.startsWith("http") ? raw : `https://${raw}`;
    const label = /linkedin/i.test(raw) ? "LinkedIn" : /github/i.test(raw) ? "GitHub" : "Website";
    links.push({ label, url });
  }

  // Partition lines into sections.
  const sections: ResumeSection[] = [];
  let current: { type: ResumeSection["type"]; heading: string; body: string[] } | null = null;
  const blocks: { type: ResumeSection["type"]; heading: string; body: string[] }[] = [];

  for (const line of lines) {
    const key = line.toLowerCase().replace(/[:•\-\s]+$/, "").trim();
    const matched = SECTION_HEADINGS[key];
    const looksLikeHeading = matched && line.length < 40;
    if (looksLikeHeading) {
      if (current) blocks.push(current);
      current = { type: matched, heading: line, body: [] };
    } else if (current && line) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);

  const bulletize = (body: string[]) =>
    body
      .filter((l) => l.length > 1)
      .map((l) => l.replace(/^[•\-*●▪]\s*/, "").trim())
      .filter(Boolean);

  for (const b of blocks) {
    if (b.type === "experience") {
      const items: any[] = [];
      let entry: any = null;
      for (const line of b.body) {
        const dm = line.match(DATE_RANGE_RE);
        if (dm) {
          if (entry) items.push(entry);
          const header = line.replace(DATE_RANGE_RE, "").replace(/[|,@]/g, " ").trim();
          const [role, company] = header.split(/\s{2,}|—|–|\bat\b/i).map((s) => s?.trim());
          entry = {
            id: randomUUID(),
            role: role || header || "Role",
            company: company || "Company",
            startDate: normalizeDate(dm[1]),
            endDate: normalizeDate(dm[2]),
            bullets: [],
          };
          low.push(`experience.${items.length}`);
        } else if (entry) {
          entry.bullets.push(line.replace(/^[•\-*●▪]\s*/, "").trim());
        }
      }
      if (entry) items.push(entry);
      if (items.length) sections.push({ id: randomUUID(), type: "experience", items });
    } else if (b.type === "skills") {
      const skills = b.body
        .join(", ")
        .split(/[,;•|]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 40);
      if (skills.length) sections.push({ id: randomUUID(), type: "skills", groups: [{ skills }] });
    } else if (b.type === "education") {
      const items = bulletize(b.body).map((l) => ({
        id: randomUUID(),
        institution: l,
        details: [] as string[],
      }));
      if (items.length) sections.push({ id: randomUUID(), type: "education", items });
    } else if (b.type === "projects") {
      const items = bulletize(b.body).map((l) => ({ id: randomUUID(), name: l, bullets: [] as string[] }));
      if (items.length) sections.push({ id: randomUUID(), type: "projects", items });
    } else if (b.type === "certifications") {
      const items = bulletize(b.body).map((l) => ({ id: randomUUID(), name: l }));
      if (items.length) sections.push({ id: randomUUID(), type: "certifications", items });
    }
  }

  const now = new Date().toISOString();
  const resume = ResumeSchema.parse({
    id: "pending",
    userId,
    title: fullName ? `${fullName} — Resume` : "Imported Resume",
    basics: { fullName, email, phone, links },
    sections,
    design: {},
    source: "upload",
    createdAt: now,
    updatedAt: now,
  });

  return { resume, lowConfidenceFields: [...new Set(low)], method: "heuristic" };
}

const LLM_SYSTEM = `You convert raw resume text into a strict JSON object matching this TypeScript type:
{ basics:{ fullName:string, headline?:string, email?:string, phone?:string, location?:string,
  links:{label:string,url:string}[], summary?:string },
  sections: Array<
    {type:"experience", items:{company,role,location?,startDate,endDate?,bullets:string[]}[]} |
    {type:"education", items:{institution,degree?,field?,startDate?,endDate?,details:string[]}[]} |
    {type:"skills", groups:{name?,skills:string[]}[]} |
    {type:"projects", items:{name,url?,bullets:string[]}[]} |
    {type:"certifications", items:{name,issuer?,date?}[]}
  > }
Rules: dates as "YYYY" or "YYYY-MM" (or "present"). Preserve every bullet, split runs into separate bullets.
Never invent facts. Omit unknown optional fields. Respond with ONLY the JSON, no markdown.`;

function withIds(parsed: any, userId: string): Resume {
  const now = new Date().toISOString();
  const sections = (parsed.sections ?? []).map((s: any) => {
    const base = { id: randomUUID(), ...s };
    if (s.type === "experience" || s.type === "education" || s.type === "projects" || s.type === "certifications") {
      base.items = (s.items ?? []).map((i: any) => ({ id: randomUUID(), bullets: [], details: [], ...i }));
    }
    return base;
  });
  return ResumeSchema.parse({
    id: "pending",
    userId,
    title: parsed.basics?.fullName ? `${parsed.basics.fullName} — Resume` : "Imported Resume",
    basics: { links: [], ...parsed.basics },
    sections,
    design: {},
    source: "upload",
    createdAt: now,
    updatedAt: now,
  });
}

/** Structure raw text into a Resume, using the LLM when configured (with zod
 * repair retries), else the deterministic heuristic parser. */
export async function parseResumeText(text: string, userId: string): Promise<ParseResult> {
  if (!hasAnthropic() || text.trim().length < 20) {
    return heuristicParse(text, userId);
  }
  const provider = new AnthropicProvider();
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const messages = [
        {
          role: "user" as const,
          content:
            attempt === 0
              ? `RAW_RESUME_TEXT:\n${text.slice(0, 12000)}`
              : `Your previous output failed validation: ${lastError}\nReturn corrected JSON only.\n\nRAW_RESUME_TEXT:\n${text.slice(0, 12000)}`,
        },
      ];
      const out = await provider.complete({ system: LLM_SYSTEM, messages, maxTokens: 3000 });
      const cleaned = out.text.replace(/```json|```/g, "").trim();
      const resume = withIds(JSON.parse(cleaned), userId);
      return { resume, lowConfidenceFields: [], method: "llm" };
    } catch (e: any) {
      lastError = String(e?.message ?? e);
    }
  }
  // LLM failed — fall back to the deterministic parser so the user is never stuck.
  return heuristicParse(text, userId);
}
