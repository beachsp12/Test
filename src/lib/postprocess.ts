import { assessRepair } from "./repairRules";
import type { ModelAnalysis, TireResult, Verdict } from "./schema";
import type { TirePosition } from "./tires";

/**
 * Turns the model's raw description into the final per-tire result:
 * adds cited repair guidance, keeps the verdict consistent with the issues,
 * and decides when to push a professional inspection.
 */
export function finalizeResult(
  position: TirePosition,
  analysis: ModelAnalysis,
  imageCount: number,
): TireResult {
  const adjustments: string[] = [];
  const issues = analysis.issues.map((issue) => ({
    ...issue,
    repair: assessRepair(issue),
  }));

  let verdict: Verdict = analysis.verdict;
  let confidence = analysis.confidence;

  if (!analysis.showsTire && verdict !== "cannot_assess") {
    verdict = "cannot_assess";
    adjustments.push("None of the files clearly showed a tire, so no verdict was given.");
  }

  const hasLikelyLeak = issues.some((i) => i.airLossRisk === "likely_leaking");
  const hasRisk = issues.some(
    (i) => i.airLossRisk === "could_fail_or_leak" || i.repair.outcome === "replace",
  );

  if (analysis.showsTire && hasLikelyLeak && verdict !== "likely_losing_air") {
    adjustments.push(
      `Raised the verdict to "likely losing air" because at least one issue looks like it's leaking now.`,
    );
    verdict = "likely_losing_air";
  } else if (analysis.showsTire && hasRisk && verdict === "no_visible_damage") {
    adjustments.push(
      `Raised the verdict to "at risk" because at least one issue could leak or fail.`,
    );
    verdict = "at_risk";
  }

  const keyAreasUnseen =
    analysis.areas.tread === "not_visible" ||
    analysis.areas.outerSidewall === "not_visible";
  if (verdict === "no_visible_damage" && keyAreasUnseen && confidence === "high") {
    confidence = "medium";
    adjustments.push(
      "Lowered confidence because the tread or outer sidewall wasn't visible.",
    );
  }

  const professionalReasons: string[] = [];
  if (verdict === "likely_losing_air" || verdict === "at_risk") {
    professionalReasons.push("The damage found could affect safety.");
  }
  if (verdict === "cannot_assess") {
    professionalReasons.push("The photos weren't enough for a verdict.");
  }
  if (confidence !== "high" && verdict !== "cannot_assess") {
    professionalReasons.push(`Confidence is only ${confidence}.`);
  }
  if (
    issues.some(
      (i) => i.repair.outcome === "replace" || i.repair.outcome === "shop_decides",
    )
  ) {
    professionalReasons.push("At least one issue needs a shop to confirm the repair or replacement.");
  }
  if (analysis.retakes.length > 0 && verdict !== "cannot_assess") {
    professionalReasons.push("Some areas of the tire couldn't be checked from these files.");
  }

  return {
    ...analysis,
    position,
    verdict,
    confidence,
    issues,
    imageCount,
    needsProfessional: professionalReasons.length > 0,
    professionalReasons: Array.from(new Set(professionalReasons)),
    adjustments,
  };
}
