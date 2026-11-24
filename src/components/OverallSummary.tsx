"use client";

import { headlineFor, rankResults, stripTirePrefix, VERDICT_LABELS } from "@/lib/summary";
import type { TireResult } from "@/lib/schema";
import { TIRE_LABELS, type TirePosition } from "@/lib/tires";
import type { RunState } from "./types";

export function OverallSummary({
  runs,
  positions,
}: {
  runs: Record<TirePosition, RunState>;
  positions: TirePosition[];
}) {
  const done: TireResult[] = [];
  const notChecked: { position: TirePosition; text: string }[] = [];
  let analyzing = 0;

  for (const p of positions) {
    const run = runs[p];
    if (run.status === "done") done.push(run.result);
    else if (run.status === "error") notChecked.push({ position: p, text: `couldn't be checked. ${stripTirePrefix(run.message, TIRE_LABELS[p])}` });
    else if (run.status === "skipped") notChecked.push({ position: p, text: stripTirePrefix(run.message, TIRE_LABELS[p]) });
    else if (run.status === "analyzing") analyzing++;
  }

  if (done.length === 0 && notChecked.length === 0 && analyzing === 0) return null;

  const ranked = rankResults(done);
  const worst = ranked[0];
  const anyPro = ranked.some((r) => r.needsProfessional);
  const urgent = ranked.filter((r) => r.verdict === "likely_losing_air");

  return (
    <section className="overall" aria-live="polite">
      <h2>Overall</h2>
      {analyzing > 0 && (
        <p className="muted">
          Still checking {analyzing} tire{analyzing === 1 ? "" : "s"}…
        </p>
      )}
      {worst && (
        <p className="overall-lead">
          {worst.verdict === "no_visible_damage" ? (
            <>No visible air-loss damage on any tire checked.</>
          ) : (
            <>
              Worst: <strong>{TIRE_LABELS[worst.position]}</strong>,{" "}
              {VERDICT_LABELS[worst.verdict].toLowerCase()}.
            </>
          )}
          {urgent.length > 0 && (
            <>
              {" "}
              Don&apos;t drive far on {urgent.length === 1 ? "that tire" : "those tires"}. Check
              the pressure and get to a tire shop.
            </>
          )}
        </p>
      )}
      {ranked.length > 0 && (
        <ol className="overall-list">
          {ranked.map((r) => (
            <li key={r.position}>
              <strong>{TIRE_LABELS[r.position]}:</strong>{" "}
              <span className={`chip verdict-${r.verdict}`}>{VERDICT_LABELS[r.verdict]}</span>{" "}
              <span className="muted">({r.confidence} confidence)</span> {headlineFor(r)}
            </li>
          ))}
        </ol>
      )}
      {notChecked.length > 0 && (
        <ul className="overall-skipped">
          {notChecked.map((n) => (
            <li key={n.position}>
              <strong>{TIRE_LABELS[n.position]}</strong>: {n.text}
            </li>
          ))}
        </ul>
      )}
      {anyPro && (
        <p className="callout pro">
          At least one tire needs a professional inspection. Photos can&apos;t catch every
          leak, such as slow leaks inside the tire or at the wheel seal.
        </p>
      )}
    </section>
  );
}
