import type { AreaKey, AreaStatusValue, IssueType, ModelIssue, Zone } from "./schema";

export const ISSUE_LABELS: Record<IssueType, string> = {
  puncture: "Puncture",
  embedded_object: "Nail, screw or other object",
  cut: "Cut",
  sidewall_bulge: "Bulge or bubble",
  cracking: "Cracking",
  bead_damage: "Bead damage",
  valve_stem: "Valve stem problem",
  existing_repair: "Old repair (plug visible)",
  tread_wear: "Worn tread",
  other: "Other damage",
};

export const ZONE_LABELS: Record<Zone, string> = {
  tread_center: "center tread",
  tread_edge: "outer edge of the tread",
  shoulder: "shoulder",
  outer_sidewall: "outer sidewall",
  inner_sidewall: "inner sidewall",
  bead: "bead (where it seals to the wheel)",
  valve_stem: "valve stem",
  unknown: "spot that's hard to place",
};

export const AREA_LABELS: Record<AreaKey, string> = {
  tread: "Tread",
  shoulders: "Shoulders",
  outerSidewall: "Outer sidewall",
  innerSidewall: "Inner sidewall",
  bead: "Bead",
  valveStem: "Valve stem",
};

export const AREA_STATUS_LABELS: Record<AreaStatusValue, string> = {
  checked_clear: "Looks fine",
  issue_found: "Issue found",
  partly_visible: "Partly seen",
  not_visible: "Not seen",
};

export const RISK_LABELS: Record<ModelIssue["airLossRisk"], string> = {
  likely_leaking: "Probably leaking",
  could_fail_or_leak: "Could leak or fail",
  low_watch_it: "Low risk, watch it",
};

export function issueTitle(issue: Pick<ModelIssue, "type" | "zone">): string {
  if (issue.type === "valve_stem") return ISSUE_LABELS.valve_stem;
  return `${ISSUE_LABELS[issue.type]} in the ${ZONE_LABELS[issue.zone]}`;
}
