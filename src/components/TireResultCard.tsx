"use client";

import {
  AREA_LABELS,
  AREA_STATUS_LABELS,
  RISK_LABELS,
  issueTitle,
} from "@/lib/labels";
import { REPAIR_OUTCOME_LABELS } from "@/lib/repairRules";
import type { AreaKey } from "@/lib/schema";
import { stripTirePrefix, VERDICT_LABELS } from "@/lib/summary";
import { TIRE_LABELS, type TirePosition } from "@/lib/tires";
import type { RunState } from "./types";

const AREA_ORDER: AreaKey[] = [
  "tread",
  "shoulders",
  "outerSidewall",
  "innerSidewall",
  "bead",
  "valveStem",
];

export function TireResultCard({
  position,
  run,
}: {
  position: TirePosition;
  run: RunState;
}) {
  const label = TIRE_LABELS[position];

  if (run.status === "error") {
    return (
      <article className="result-card result-error">
        <h3>{label}</h3>
        <p>
          <strong>Couldn&apos;t check this tire.</strong> {stripTirePrefix(run.message, label)}
        </p>
      </article>
    );
  }
  if (run.status === "skipped") {
    return (
      <article className="result-card result-skipped">
        <h3>{label}</h3>
        <p>{stripTirePrefix(run.message, label)}</p>
      </article>
    );
  }
  if (run.status === "analyzing") {
    return (
      <article className="result-card result-busy">
        <h3>{label}</h3>
        <p>Checking this tire… this usually takes under a minute.</p>
      </article>
    );
  }
  if (run.status !== "done") return null;

  const r = run.result;
  return (
    <article className={`result-card verdict-border-${r.verdict}`}>
      <header className="result-header">
        <h3>{label}</h3>
        <span className={`chip verdict-${r.verdict}`}>{VERDICT_LABELS[r.verdict]}</span>
        <span className="chip chip-muted">Confidence: {r.confidence}</span>
      </header>

      {!r.showsTire && (
        <p className="callout warn">
          These files don&apos;t seem to show a tire. Upload clear photos of the{" "}
          {label.toLowerCase()} tire and try again.
        </p>
      )}

      <p className="summary">{r.summary}</p>

      {r.issues.length > 0 && (
        <div className="issues">
          <h4>What we found</h4>
          <ol>
            {r.issues.map((issue, idx) => (
              <li key={idx} className={`issue risk-${issue.airLossRisk}`}>
                <div className="issue-head">
                  <strong>{issueTitle(issue)}</strong>
                  <span className={`chip risk-chip-${issue.airLossRisk}`}>
                    {RISK_LABELS[issue.airLossRisk]}
                  </span>
                </div>
                <p className="issue-where">
                  <span className="muted">Where:</span> {label}, {issue.locationDetail}
                  {issue.estimatedSizeMm !== null && (
                    <> · about {issue.estimatedSizeMm} mm</>
                  )}
                </p>
                <p>
                  <span className="muted">Why it matters:</span> {issue.whyItMatters}
                </p>
                <div className={`repair repair-${issue.repair.outcome}`}>
                  <p className="repair-label">{REPAIR_OUTCOME_LABELS[issue.repair.outcome]}</p>
                  <p>
                    <strong>{issue.repair.headline}.</strong> {issue.repair.reason}
                  </p>
                  {issue.repair.sources.length > 0 && (
                    <details>
                      <summary>Source{issue.repair.sources.length > 1 ? "s" : ""}</summary>
                      <ul className="sources">
                        {issue.repair.sources.map((s, i) => (
                          <li key={i}>
                            <q>{s.quote}</q>{" "}
                            <a href={s.url} target="_blank" rel="noreferrer">
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <p className="evidence muted">
                  Seen in: {issue.evidence} · {issue.confidence} confidence
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="areas">
        <h4>Areas checked</h4>
        <ul>
          {AREA_ORDER.map((key) => (
            <li key={key} className={`area area-${r.areas[key]}`}>
              <span>{AREA_LABELS[key]}</span>
              <span>{AREA_STATUS_LABELS[r.areas[key]]}</span>
            </li>
          ))}
        </ul>
      </div>

      {r.retakes.length > 0 && (
        <div className="retakes">
          <h4>Retake these shots</h4>
          <ul>
            {r.retakes.map((rt, i) => (
              <li key={i}>
                <strong>
                  {label}: {rt.shot}
                </strong>
                {rt.reason && <span className="muted">. {rt.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.imageQualityNotes && (
        <p className="muted small">Photo quality: {r.imageQualityNotes}</p>
      )}
      {r.otherObservations && (
        <p className="small">
          <span className="muted">Also noticed:</span> {r.otherObservations}
        </p>
      )}
      {r.filesWithoutTire.length > 0 && (
        <p className="small muted">
          These files didn&apos;t show a tire and were ignored: {r.filesWithoutTire.join("; ")}
        </p>
      )}
      {r.adjustments.length > 0 && (
        <p className="small muted">App note: {r.adjustments.join(" ")}</p>
      )}

      {r.needsProfessional && (
        <div className="callout pro">
          <strong>Get this tire checked by a tire shop.</strong> {r.professionalReasons.join(" ")}{" "}
          A photo check can&apos;t find every leak, such as slow leaks from inside the tire,
          the valve core, or where the tire seals against the wheel.
        </div>
      )}

      <p className="small muted">Based on {r.imageCount} image{r.imageCount === 1 ? "" : "s"}.</p>
    </article>
  );
}
