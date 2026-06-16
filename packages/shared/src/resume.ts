import { z } from "zod";

export const LinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export const BasicsSchema = z.object({
  // Allowed to be empty: scratch resumes start blank and imports may not detect
  // a name. The review screen / editor prompts the user to fill it in.
  fullName: z.string().default(""),
  headline: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(LinkSchema).default([]),
  summary: z.string().optional(),
});

export const ExperienceItemSchema = z.object({
  id: z.string(),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(), // YYYY-MM or YYYY
  endDate: z.union([z.string(), z.literal("present")]).optional(),
  bullets: z.array(z.string()).default([]),
});

export const EducationItemSchema = z.object({
  id: z.string(),
  institution: z.string().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.union([z.string(), z.literal("present")]).optional(),
  details: z.array(z.string()).default([]),
});

export const ProjectItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  url: z.string().url().optional(),
  bullets: z.array(z.string()).default([]),
});

export const CertItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

export const BulletItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const SkillsGroupSchema = z.object({
  name: z.string().optional(),
  skills: z.array(z.string()).default([]),
});

export const ResumeSectionSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("experience"), items: z.array(ExperienceItemSchema) }),
  z.object({ id: z.string(), type: z.literal("education"), items: z.array(EducationItemSchema) }),
  z.object({ id: z.string(), type: z.literal("skills"), groups: z.array(SkillsGroupSchema) }),
  z.object({ id: z.string(), type: z.literal("projects"), items: z.array(ProjectItemSchema) }),
  z.object({ id: z.string(), type: z.literal("certifications"), items: z.array(CertItemSchema) }),
  z.object({ id: z.string(), type: z.literal("custom"), heading: z.string(), items: z.array(BulletItemSchema) }),
]);

export const ResumeDesignSchema = z.object({
  template: z.enum(["classic", "modern", "compact"]).default("classic"),
  fontFamily: z.string().default("Helvetica"),
  accentColor: z.string().default("#1f2933"),
  fontScale: z.number().min(0.8).max(1.3).default(1),
  margins: z.enum(["tight", "normal", "roomy"]).default("normal"),
});

// ATS types live in ats.ts; referenced loosely here to avoid a cycle.
export const ResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().default("Untitled Resume"),
  targetRole: z.string().optional(),
  targetJobDescription: z.string().optional(),
  basics: BasicsSchema,
  sections: z.array(ResumeSectionSchema).default([]),
  design: ResumeDesignSchema.default({}),
  source: z.enum(["scratch", "upload", "linkedin"]).default("scratch"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Link = z.infer<typeof LinkSchema>;
export type Basics = z.infer<typeof BasicsSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type CertItem = z.infer<typeof CertItemSchema>;
export type SkillsGroup = z.infer<typeof SkillsGroupSchema>;
export type ResumeSection = z.infer<typeof ResumeSectionSchema>;
export type ResumeDesign = z.infer<typeof ResumeDesignSchema>;
export type Resume = z.infer<typeof ResumeSchema>;

export const ATS_SAFE_FONTS = ["Helvetica", "Arial", "Georgia", "Times New Roman", "Calibri"] as const;
