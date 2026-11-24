import { z } from "zod";
import { TIRE_POSITIONS, type TirePosition } from "./tires";
import type { RepairAssessment } from "./repairRules";

/* ------------------------------------------------------------------ */
/* What the browser sends to /api/analyze                              */
/* ------------------------------------------------------------------ */

export const AnalyzeImageSchema = z.object({
  /** Human-readable label, e.g. `Photo 2 of 3 ("IMG_0412.jpg")`. */
  label: z.string().min(1).max(300),
  kind: z.enum(["photo", "video_frame"]),
  mediaType: z.literal("image/jpeg"),
  /** Base64 JPEG data, no `data:` prefix. */
  data: z.string().min(1),
});

export const AnalyzeRequestSchema = z.object({
  position: z.enum(TIRE_POSITIONS),
  images: z.array(AnalyzeImageSchema),
});

export type AnalyzeImage = z.infer<typeof AnalyzeImageSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/* ------------------------------------------------------------------ */
/* What the vision model must return (structured output)              */
/* ------------------------------------------------------------------ */

export const ISSUE_TYPES = [
  "puncture",
  "embedded_object",
  "cut",
  "sidewall_bulge",
  "cracking",
  "bead_damage",
  "valve_stem",
  "existing_repair",
  "tread_wear",
  "other",
] as const;

export const ZONES = [
  "tread_center",
  "tread_edge",
  "shoulder",
  "outer_sidewall",
  "inner_sidewall",
  "bead",
  "valve_stem",
  "unknown",
] as const;

export const VERDICTS = [
  "likely_losing_air",
  "at_risk",
  "no_visible_damage",
  "cannot_assess",
] as const;

const Confidence = z.enum(["high", "medium", "low"]);
const AreaStatus = z.enum([
  "checked_clear",
  "issue_found",
  "partly_visible",
  "not_visible",
]);

export const ModelIssueSchema = z.object({
  type: z.enum(ISSUE_TYPES),
  zone: z.enum(ZONES),
  locationDetail: z
    .string()
    .describe("Where on this tire, e.g. 'center rib, near the valve stem'."),
  evidence: z
    .string()
    .describe("Image labels that show it, e.g. 'Photo 2; video frames 4-5'."),
  airLossRisk: z.enum(["likely_leaking", "could_fail_or_leak", "low_watch_it"]),
  estimatedSizeMm: z
    .number()
    .nullable()
    .describe("Largest dimension in mm, only if a size reference is visible."),
  sizeBasis: z.string(),
  exposedCordsOrBelts: z.boolean(),
  whyItMatters: z.string(),
  confidence: Confidence,
});

export const ModelAnalysisSchema = z.object({
  showsTire: z.boolean(),
  filesWithoutTire: z.array(z.string()),
  verdict: z.enum(VERDICTS),
  confidence: Confidence,
  summary: z.string(),
  issues: z.array(ModelIssueSchema),
  areas: z.object({
    tread: AreaStatus,
    shoulders: AreaStatus,
    outerSidewall: AreaStatus,
    innerSidewall: AreaStatus,
    bead: AreaStatus,
    valveStem: AreaStatus,
  }),
  imageQualityNotes: z.string(),
  retakes: z.array(z.object({ shot: z.string(), reason: z.string() })),
  otherObservations: z.string(),
});

export type ModelIssue = z.infer<typeof ModelIssueSchema>;
export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>;
export type Verdict = (typeof VERDICTS)[number];
export type Zone = (typeof ZONES)[number];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type AreaKey = keyof ModelAnalysis["areas"];
export type AreaStatusValue = z.infer<typeof AreaStatus>;
export type ConfidenceValue = z.infer<typeof Confidence>;

/* ------------------------------------------------------------------ */
/* What /api/analyze returns to the browser                           */
/* ------------------------------------------------------------------ */

export type TireIssue = ModelIssue & { repair: RepairAssessment };

export type TireResult = Omit<ModelAnalysis, "issues"> & {
  position: TirePosition;
  issues: TireIssue[];
  imageCount: number;
  needsProfessional: boolean;
  professionalReasons: string[];
  /** Notes when the app overrode the model, for transparency. */
  adjustments: string[];
};

export type ApiError = { error: { code: string; message: string } };
