import { z } from "zod";
import { ResumePatchSchema } from "./patch";

export const AtsSubscoresSchema = z.object({
  parseability: z.number().min(0).max(100),
  keywordMatch: z.number().min(0).max(100),
  structure: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  formatting: z.number().min(0).max(100),
});
export type AtsSubscores = z.infer<typeof AtsSubscoresSchema>;

export const AtsFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "warning", "suggestion"]),
  area: z.enum(["parseability", "keywordMatch", "structure", "impact", "formatting"]),
  message: z.string(),
  fix: z
    .object({
      description: z.string(),
      autoApplyPatch: z.array(ResumePatchSchema).optional(),
    })
    .optional(),
});
export type AtsFinding = z.infer<typeof AtsFindingSchema>;

export const AtsScoreResultSchema = z.object({
  overall: z.number().min(0).max(100),
  subscores: AtsSubscoresSchema,
  findings: z.array(AtsFindingSchema),
  version: z.string(),
});
export type AtsScoreResult = z.infer<typeof AtsScoreResultSchema>;

export const ATS_SCORER_VERSION = "1.0.0";

/** Weighting of subscores into the overall score. Sums to 1. */
export const ATS_WEIGHTS: Record<keyof AtsSubscores, number> = {
  parseability: 0.3,
  keywordMatch: 0.25,
  structure: 0.15,
  impact: 0.2,
  formatting: 0.1,
};
