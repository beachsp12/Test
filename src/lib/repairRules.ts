/**
 * Repair-or-replace rules.
 *
 * The vision model only describes what it sees (type, zone, size). The
 * decision below comes from published guidance, checked against the source
 * documents in November 2026. Every rule cites where it comes from. Where no
 * published standard applies, the reason says so plainly.
 */
import type { ModelIssue } from "./schema";

export type SourceRef = { title: string; url: string; quote: string };

export const SOURCES = {
  ustmaChart: {
    title:
      'USTMA, "Puncture Repair Procedures for Passenger and Light Truck Tires" (2025)',
    url: "https://www.ustires.org/system/files/2026-06/Puncture%20Repair%20Procedures%20for%20Passenger%20and%20Light%20Truck%20Tires.pdf",
  },
  ustmaBasics: {
    title: 'USTMA, "Tire Repair Basics"',
    url: "https://www.ustires.org/tire-care-safety/tire-repair-basics",
  },
  cfr5709: {
    title: "49 CFR § 570.9, Tires (federal vehicle inspection standard)",
    url: "https://www.law.cornell.edu/cfr/text/49/570.9",
  },
} as const;

/** USTMA: "Puncture injury cannot be greater than 1/4-inch (6mm) in diameter". */
export const MAX_REPAIRABLE_INJURY_MM = 6;

const Q = {
  treadOnly: {
    ...SOURCES.ustmaChart,
    quote: "Repairs are limited to the tread area.",
  },
  sizeLimit: {
    ...SOURCES.ustmaChart,
    quote: "Puncture injury cannot be greater than 1/4-inch (6mm) in diameter.",
  },
  shoulder: {
    ...SOURCES.ustmaChart,
    quote:
      "DO NOT make repairs where the injury damage extends into the shoulder/belt edge area OR where the injury extends at an angle into the shoulder area. If there is any question that the injury extends into the shoulder/belt edge area, then the tire must be taken out of service.",
  },
  plugPatch: {
    ...SOURCES.ustmaChart,
    quote:
      "A rubber stem, or plug, must be applied to fill the puncture injury and a patch must be applied to seal the innerliner. A repair using a plug only or a patch only is NOT ACCEPTABLE.",
  },
  offRim: {
    ...SOURCES.ustmaChart,
    quote:
      "Repairs must be performed by removing the tire from the rim/wheel assembly to perform a complete inspection. NEVER perform an outside-in tire repair or on-the-wheel repair.",
  },
  improperRepair: {
    ...SOURCES.ustmaChart,
    quote:
      "NEVER repair a tire that has an existing, improper repair; the tire must be scrapped. Repairs cannot overlap.",
  },
  runflat: {
    ...SOURCES.ustmaBasics,
    quote:
      "Some tire manufacturers may have repair limits or restrictions for some tires, such as runflat tires and others.",
  },
  bulge: {
    ...SOURCES.cfr5709,
    quote:
      "Tires shall be free from chunking, bumps, knots, or bulges evidencing cord, ply, or tread separation from the casing or other adjacent materials.",
  },
  cords: {
    ...SOURCES.cfr5709,
    quote:
      "Tire cords or belting materials shall not be exposed, either to the naked eye or when cuts or abrasions on the tire are probed.",
  },
  tread: {
    ...SOURCES.cfr5709,
    quote:
      "The tread on each tire shall be not less than two thirty-seconds of an inch deep.",
  },
} satisfies Record<string, SourceRef>;

export type RepairOutcome =
  | "typically_repairable"
  | "replace"
  | "shop_decides"
  | "valve_service"
  | "monitor";

export type RepairAssessment = {
  outcome: RepairOutcome;
  headline: string;
  reason: string;
  sources: SourceRef[];
};

export const REPAIR_OUTCOME_LABELS: Record<RepairOutcome, string> = {
  typically_repairable: "Usually repairable",
  replace: "Needs a new tire",
  shop_decides: "A shop has to decide",
  valve_service: "Valve stem fix, not a tire repair",
  monitor: "Keep an eye on it",
};

const OUTSIDE_REPAIR_AREA = new Set<ModelIssue["zone"]>([
  "tread_edge",
  "shoulder",
  "outer_sidewall",
  "inner_sidewall",
  "bead",
]);

const ZONE_WORDS: Record<ModelIssue["zone"], string> = {
  tread_center: "the center tread",
  tread_edge: "the outer edge of the tread",
  shoulder: "the shoulder",
  outer_sidewall: "the outer sidewall",
  inner_sidewall: "the inner sidewall",
  bead: "the bead (where the tire seals to the wheel)",
  valve_stem: "the valve stem",
  unknown: "an unclear spot",
};

function injuryRule(issue: ModelIssue): RepairAssessment {
  const size = issue.estimatedSizeMm;
  const where = ZONE_WORDS[issue.zone];

  if (issue.zone === "valve_stem") return valveRule();

  if (OUTSIDE_REPAIR_AREA.has(issue.zone)) {
    return {
      outcome: "replace",
      headline: "Not repairable here: replace the tire",
      reason: `It's in ${where}. Industry rules only allow puncture repairs in the main tread area. Damage in the shoulder, sidewall or bead can't be safely patched.`,
      sources: [Q.treadOnly, Q.shoulder],
    };
  }

  if (issue.zone === "unknown") {
    return {
      outcome: "shop_decides",
      headline: "Location unclear: a shop needs to look",
      reason:
        "If it turns out to reach the shoulder, the tire has to be replaced. If it's in the main tread and 1/4 inch or smaller, it can usually be fixed.",
      sources: [Q.shoulder, Q.sizeLimit],
    };
  }

  // Center tread from here on.
  if (size !== null && size > MAX_REPAIRABLE_INJURY_MM) {
    return {
      outcome: "replace",
      headline: "Too big to repair: replace the tire",
      reason: `It looks about ${size} mm across. The limit for a repair is 1/4 inch (6 mm).`,
      sources: [Q.sizeLimit],
    };
  }

  if (issue.type === "cut" && size === null) {
    return {
      outcome: "shop_decides",
      headline: "Depends on the cut's size",
      reason:
        "Cuts are often longer than the 1/4 inch (6 mm) repair limit. A shop needs to measure it with the tire off the wheel.",
      sources: [Q.sizeLimit, Q.offRim],
    };
  }

  const sizeNote =
    size === null
      ? "The photos don't show its size, so a shop must confirm it's 1/4 inch (6 mm) or smaller."
      : `It looks about ${size} mm, inside the 1/4 inch (6 mm) limit, but a shop must measure it.`;

  return {
    outcome: "typically_repairable",
    headline: "Usually repairable if a shop confirms the size",
    reason: `${sizeNote} A proper repair means taking the tire off the wheel, checking the inside, and using a plug plus an inside patch. A plug alone isn't an acceptable fix. Run-flat and some other tires can have stricter limits from the maker.`,
    sources: [Q.sizeLimit, Q.plugPatch, Q.offRim, Q.runflat],
  };
}

function valveRule(): RepairAssessment {
  return {
    outcome: "valve_service",
    headline: "Replace the valve stem or core",
    reason:
      "The valve stem is a separate part from the tire. Shops replace a cracked, bent or leaking stem or valve core as routine work. No USTMA tire repair rule covers this, so no standard is cited. If your car has pressure sensors (TPMS) in the stems, the shop may need a sensor service kit.",
    sources: [],
  };
}

export function assessRepair(issue: ModelIssue): RepairAssessment {
  // Exposed cords/belts outrank everything else.
  if (issue.exposedCordsOrBelts) {
    return {
      outcome: "replace",
      headline: "Cords showing: replace the tire",
      reason:
        "Exposed cords or belts mean the tire's structure is damaged. Federal inspection rules don't allow it, and there's no repair for it.",
      sources: [Q.cords],
    };
  }

  switch (issue.type) {
    case "puncture":
    case "embedded_object":
    case "cut":
      return injuryRule(issue);

    case "sidewall_bulge":
      return {
        outcome: "replace",
        headline: "Bulge: replace the tire",
        reason:
          "A bulge or bubble means the inside layers have separated, usually after an impact. It can burst without warning. You can't repair it, and federal inspection rules reject tires with bulges.",
        sources: [Q.bulge, Q.treadOnly],
      };

    case "bead_damage":
      return {
        outcome: "replace",
        headline: "Bead damage: replace the tire",
        reason:
          "The bead is what seals the tire to the wheel. Damage there sits outside the area where repairs are allowed. If the leak is really from corrosion on the wheel rim rather than damage to the tire, a shop can often clean and reseal it. That's normal shop practice, not something a published standard covers.",
        sources: [Q.treadOnly],
      };

    case "valve_stem":
      return valveRule();

    case "existing_repair":
      return {
        outcome: "shop_decides",
        headline: "Have the old repair checked",
        reason:
          "From outside you can't tell whether it's a proper plug-and-patch or a plug alone. A plug alone isn't an acceptable repair, and a tire with one should be scrapped. New repairs also can't overlap an old one.",
        sources: [Q.improperRepair, Q.plugPatch],
      };

    case "cracking":
      if (issue.airLossRisk === "low_watch_it") {
        return {
          outcome: "monitor",
          headline: "Surface cracking: get it checked at your next service",
          reason:
            "Fine surface cracks from age or weather don't always mean the tire is unsafe. No published standard sets a crack-depth limit, so a tire professional needs to judge it in person. Deeper cracks or any cords showing mean replacement.",
          sources: [Q.cords],
        };
      }
      return {
        outcome: "replace",
        headline: "Deep cracking: plan to replace the tire",
        reason:
          "Cracks deep enough to leak or weaken the tire can't be patched. Repairs only cover punctures in the tread area, and exposed cords fail federal inspection rules.",
        sources: [Q.treadOnly, Q.cords],
      };

    case "tread_wear":
      if (issue.airLossRisk === "low_watch_it") {
        return {
          outcome: "monitor",
          headline: "Check the tread depth",
          reason:
            "Worn tread isn't a leak by itself, but very thin tread punctures more easily. The legal minimum is 2/32 inch, which is when the tread is level with the wear bars.",
          sources: [Q.tread],
        };
      }
      return {
        outcome: "replace",
        headline: "Worn out: replace the tire",
        reason:
          "Tread at or near the wear bars (2/32 inch) is below the federal inspection minimum, and thin tread punctures more easily.",
        sources: [Q.tread],
      };

    case "other":
    default:
      return {
        outcome: "shop_decides",
        headline: "A shop needs to look at this",
        reason:
          "This doesn't match a specific published repair rule, so a tire professional has to inspect it in person.",
        sources: [Q.offRim],
      };
  }
}
