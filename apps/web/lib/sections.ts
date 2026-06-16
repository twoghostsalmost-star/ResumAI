import type { ResumeSection } from "@resumeforge/shared";
import { uid } from "./ids";

export type SectionType = ResumeSection["type"];

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  custom: "Custom",
};

export function makeSection(type: SectionType): ResumeSection {
  switch (type) {
    case "experience":
      return { id: uid("sec"), type, items: [] };
    case "education":
      return { id: uid("sec"), type, items: [] };
    case "skills":
      return { id: uid("sec"), type, groups: [{ skills: [] }] };
    case "projects":
      return { id: uid("sec"), type, items: [] };
    case "certifications":
      return { id: uid("sec"), type, items: [] };
    case "custom":
      return { id: uid("sec"), type, heading: "New Section", items: [] };
  }
}
