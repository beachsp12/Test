import { issueTitle } from "./labels";
import type { ConfidenceValue, TireResult, Verdict } from "./schema";

export const VERDICT_LABELS: Record<Verdict, string> = {
  likely_losing_air: "Likely losing air",
  at_risk: "At risk",
  no_visible_damage: "No visible air-loss damage",
  cannot_assess: "Can't tell from these files",
};

const VERDICT_RANK: Record<Verdict, number> = {
  likely_losing_air: 0,
  at_risk: 1,
  cannot_assess: 2,
  no_visible_damage: 3,
};

const CONFIDENCE_RANK: Record<ConfidenceValue, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Worst first: verdict, then confidence, then number of issues. */
export function rankResults(results: TireResult[]): TireResult[] {
  return [...results].sort(
    (a, b) =>
      VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
      CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] ||
      b.issues.length - a.issues.length,
  );
}

/** A short phrase naming the most serious thing found on a tire. */
export function headlineFor(result: TireResult): string {
  if (!result.showsTire) return "The files don't clearly show a tire.";
  const worst =
    result.issues.find((i) => i.airLossRisk === "likely_leaking") ??
    result.issues.find((i) => i.airLossRisk === "could_fail_or_leak") ??
    result.issues[0];
  if (worst) {
    const more = result.issues.length - 1;
    return `${issueTitle(worst)}${more > 0 ? ` (+${more} more)` : ""}.`;
  }
  if (result.verdict === "cannot_assess") return "Need better photos to judge it.";
  return "Nothing found that would cause air loss.";
}

/** Server and skip messages start with "Front left: ..."; drop that where the label is already shown. */
export function stripTirePrefix(message: string, label: string): string {
  const rest = message.startsWith(`${label}: `) ? message.slice(label.length + 2) : message;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
