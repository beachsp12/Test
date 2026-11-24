"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_PHOTOS_PER_TIRE, MAX_VIDEOS_PER_TIRE } from "@/lib/limits";
import {
  MediaError,
  classifyFile,
  formatTimestamp,
  preparePhoto,
  prepareVideo,
} from "@/lib/media";
import type { AnalyzeImage, AnalyzeRequest, ApiError, TireResult } from "@/lib/schema";
import { rankResults } from "@/lib/summary";
import { MAIN_TIRES, TIRE_LABELS, TIRE_POSITIONS, type TirePosition } from "@/lib/tires";
import { OverallSummary } from "./OverallSummary";
import { TireResultCard } from "./TireResultCard";
import { TireUploadSection } from "./TireUploadSection";
import type { MediaItem, RunState } from "./types";

type Status = { apiKeyConfigured: boolean; message: string | null } | null;

const CONCURRENCY = 2;

function emptyRecord<T>(make: () => T): Record<TirePosition, T> {
  return Object.fromEntries(TIRE_POSITIONS.map((p) => [p, make()])) as Record<
    TirePosition,
    T
  >;
}

let idCounter = 0;
const newId = () => `m${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Label every image so the model knows exactly which file and frame it is. */
function buildImages(items: MediaItem[]): AnalyzeImage[] {
  const ready = items.filter((i) => i.status === "ready");
  const photos = ready.filter((i) => i.kind === "photo");
  const videos = ready.filter((i) => i.kind === "video");
  const images: AnalyzeImage[] = [];

  photos.forEach((p, idx) => {
    images.push({
      label: `Photo ${idx + 1} of ${photos.length} ("${p.fileName}")`,
      kind: "photo",
      mediaType: "image/jpeg",
      data: p.frames[0].base64,
    });
  });
  videos.forEach((v, vIdx) => {
    v.frames.forEach((f, fIdx) => {
      images.push({
        label: `Video ${vIdx + 1} ("${v.fileName}"), frame ${fIdx + 1} of ${v.frames.length} at ${formatTimestamp(f.timestampSec ?? 0)}`,
        kind: "video_frame",
        mediaType: "image/jpeg",
        data: f.base64,
      });
    });
  });
  return images;
}

async function postAnalysis(body: AnalyzeRequest): Promise<TireResult> {
  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the app's server. Is `npm run dev` still running?");
  }
  const data = (await res.json().catch(() => null)) as TireResult | ApiError | null;
  if (!res.ok || !data || "error" in data) {
    const message =
      data && "error" in data
        ? data.error.message
        : res.status === 413
          ? "The upload was too large. Try fewer or smaller files."
          : `The server returned an error (${res.status}). Try again.`;
    throw new Error(message);
  }
  return data;
}

export function TireInspector() {
  const [sections, setSections] = useState<Record<TirePosition, MediaItem[]>>(() =>
    emptyRecord(() => []),
  );
  const [runs, setRuns] = useState<Record<TirePosition, RunState>>(() =>
    emptyRecord<RunState>(() => ({ status: "idle" })),
  );
  const [showSpare, setShowSpare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const positions = useMemo<TirePosition[]>(
    () => (showSpare ? [...MAIN_TIRES, "spare"] : MAIN_TIRES),
    [showSpare],
  );

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: Status) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  const updateItem = useCallback(
    (position: TirePosition, id: string, patch: Partial<MediaItem>) => {
      setSections((prev) => ({
        ...prev,
        [position]: prev[position].map((it) => (it.id === id ? { ...it, ...patch } : it)),
      }));
    },
    [],
  );

  const addFiles = useCallback(
    (position: TirePosition, files: File[]) => {
      const existing = sectionsRef.current[position].filter((i) => i.status !== "error");
      let photos = existing.filter((i) => i.kind === "photo").length;
      let videos = existing.filter((i) => i.kind === "video").length;
      const label = TIRE_LABELS[position];

      const newItems: MediaItem[] = [];
      const jobs: { item: MediaItem; file: File }[] = [];

      for (const file of files) {
        const item: MediaItem = {
          id: newId(),
          fileName: file.name || "unnamed file",
          kind: "unsupported",
          status: "processing",
          frames: [],
        };
        try {
          item.kind = classifyFile(file);
        } catch (err) {
          item.status = "error";
          item.error = err instanceof MediaError ? err.message : "This file can't be used.";
          newItems.push(item);
          continue;
        }
        if (item.kind === "photo" && photos >= MAX_PHOTOS_PER_TIRE) {
          item.status = "error";
          item.error = `${label} already has ${MAX_PHOTOS_PER_TIRE} photos, the limit for one tire. Remove one to add this.`;
        } else if (item.kind === "video" && videos >= MAX_VIDEOS_PER_TIRE) {
          item.status = "error";
          item.error = `${label} already has ${MAX_VIDEOS_PER_TIRE} videos, the limit for one tire. Remove one to add this.`;
        } else {
          if (item.kind === "photo") photos++;
          else videos++;
          jobs.push({ item, file });
        }
        newItems.push(item);
      }

      setSections((prev) => ({ ...prev, [position]: [...prev[position], ...newItems] }));

      // Process files one after another to keep memory use reasonable.
      (async () => {
        for (const { item, file } of jobs) {
          try {
            if (item.kind === "photo") {
              const frame = await preparePhoto(file);
              updateItem(position, item.id, { status: "ready", frames: [frame] });
            } else {
              updateItem(position, item.id, { progress: "Reading video…" });
              const { frames, durationSec } = await prepareVideo(file, (done, total) =>
                updateItem(position, item.id, { progress: `Sampling frames ${done}/${total}…` }),
              );
              updateItem(position, item.id, {
                status: "ready",
                frames,
                durationSec,
                progress: undefined,
              });
            }
          } catch (err) {
            updateItem(position, item.id, {
              status: "error",
              error:
                err instanceof MediaError ? err.message : "This file couldn't be read.",
              progress: undefined,
            });
          }
        }
      })();
    },
    [updateItem],
  );

  const removeItem = useCallback((position: TirePosition, id: string) => {
    setSections((prev) => ({
      ...prev,
      [position]: prev[position].filter((it) => it.id !== id),
    }));
  }, []);

  const analyze = useCallback(async (targets: TirePosition[]) => {
    setBusy(true);
    const queue: { position: TirePosition; images: AnalyzeImage[] }[] = [];
    const updates: Partial<Record<TirePosition, RunState>> = {};

    for (const position of targets) {
      const items = sectionsRef.current[position];
      const label = TIRE_LABELS[position];
      if (items.some((i) => i.status === "processing")) {
        updates[position] = {
          status: "skipped",
          message: `${label}: files are still being prepared. Wait a moment and check again.`,
        };
        continue;
      }
      if (items.length === 0) {
        updates[position] = {
          status: "skipped",
          message: `${label}: no photos or video added, so this tire was skipped.`,
        };
        continue;
      }
      const images = buildImages(items);
      if (images.length === 0) {
        updates[position] = {
          status: "skipped",
          message: `${label}: none of the files could be used, so this tire was skipped. See the errors above.`,
        };
        continue;
      }
      updates[position] = { status: "analyzing" };
      queue.push({ position, images });
    }
    setRuns((prev) => ({ ...prev, ...updates }));

    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const job = queue[next++];
        try {
          const result = await postAnalysis({ position: job.position, images: job.images });
          setRuns((prev) => ({ ...prev, [job.position]: { status: "done", result } }));
        } catch (err) {
          setRuns((prev) => ({
            ...prev,
            [job.position]: {
              status: "error",
              message: err instanceof Error ? err.message : "Something went wrong.",
            },
          }));
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setBusy(false);
  }, []);

  // Results area: checked tires worst first, then errors/skips, then in-progress.
  const resultOrder = useMemo(() => {
    const done = rankResults(
      positions.flatMap((p) => {
        const r = runs[p];
        return r.status === "done" ? [r.result] : [];
      }),
    ).map((r) => r.position);
    const others = positions.filter((p) => !done.includes(p) && runs[p].status !== "idle");
    return [...done, ...others];
  }, [positions, runs]);

  const anyFiles = positions.some((p) => sections[p].length > 0);

  return (
    <div className="inspector">
      {status && !status.apiKeyConfigured && (
        <div className="callout error" role="alert">
          <strong>API key missing.</strong> {status.message}
        </div>
      )}

      <div className="sections-grid">
        {positions.map((p) => (
          <TireUploadSection
            key={p}
            position={p}
            items={sections[p]}
            run={runs[p]}
            busy={busy}
            onAddFiles={addFiles}
            onRemoveItem={removeItem}
            onAnalyze={(pos) => analyze([pos])}
            onRemoveSection={
              p === "spare"
                ? () => {
                    setShowSpare(false);
                    setSections((prev) => ({ ...prev, spare: [] }));
                    setRuns((prev) => ({ ...prev, spare: { status: "idle" } }));
                  }
                : undefined
            }
          />
        ))}
      </div>

      <div className="global-actions">
        {!showSpare && (
          <button
            type="button"
            className="button secondary"
            onClick={() => setShowSpare(true)}
            disabled={busy}
          >
            + Add spare tire
          </button>
        )}
        <button
          type="button"
          className="button primary"
          onClick={() => analyze(positions)}
          disabled={busy || !anyFiles}
        >
          {busy ? "Checking…" : `Check all ${positions.length} tires`}
        </button>
      </div>

      <OverallSummary runs={runs} positions={positions} />

      {resultOrder.length > 0 && (
        <section className="results">
          <h2>Tire by tire</h2>
          {resultOrder.map((p) => (
            <TireResultCard key={p} position={p} run={runs[p]} />
          ))}
        </section>
      )}
    </div>
  );
}
