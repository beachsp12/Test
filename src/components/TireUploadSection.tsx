"use client";

import { useRef, useState } from "react";
import { MAX_PHOTOS_PER_TIRE, MAX_VIDEOS_PER_TIRE } from "@/lib/limits";
import { VERDICT_LABELS } from "@/lib/summary";
import { TIRE_LABELS, type TirePosition } from "@/lib/tires";
import type { MediaItem, RunState } from "./types";

type Props = {
  position: TirePosition;
  items: MediaItem[];
  run: RunState;
  busy: boolean;
  onAddFiles: (position: TirePosition, files: File[]) => void;
  onRemoveItem: (position: TirePosition, id: string) => void;
  onAnalyze: (position: TirePosition) => void;
  onRemoveSection?: () => void;
};

const SHOT_TIPS: Record<TirePosition, string> = {
  front_left: "Turn the wheel outward to see more tread.",
  front_right: "Turn the wheel outward to see more tread.",
  rear_left: "Roll the car a little to see the tread that touched the ground.",
  rear_right: "Roll the car a little to see the tread that touched the ground.",
  spare: "Take it out of the trunk if you can, and photograph both sides.",
};

function statusChip(run: RunState) {
  switch (run.status) {
    case "analyzing":
      return <span className="chip chip-busy">Checking…</span>;
    case "done":
      return (
        <span className={`chip verdict-${run.result.verdict}`}>
          {VERDICT_LABELS[run.result.verdict]}
        </span>
      );
    case "error":
      return <span className="chip chip-error">Couldn&apos;t check</span>;
    case "skipped":
      return <span className="chip chip-muted">Skipped</span>;
    default:
      return null;
  }
}

export function TireUploadSection({
  position,
  items,
  run,
  busy,
  onAddFiles,
  onRemoveItem,
  onAnalyze,
  onRemoveSection,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const label = TIRE_LABELS[position];

  const photos = items.filter((i) => i.kind === "photo" && i.status !== "error").length;
  const videos = items.filter((i) => i.kind === "video" && i.status !== "error").length;
  const processing = items.some((i) => i.status === "processing");

  return (
    <section
      className={`tire-section${dragging ? " dragging" : ""}`}
      aria-labelledby={`${position}-title`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) onAddFiles(position, Array.from(e.dataTransfer.files));
      }}
    >
      <header className="tire-section-header">
        <h3 id={`${position}-title`}>{label}</h3>
        {statusChip(run)}
        {onRemoveSection && (
          <button
            type="button"
            className="link-button"
            onClick={onRemoveSection}
            disabled={busy}
          >
            Remove spare
          </button>
        )}
      </header>

      <p className="hint">
        Add close photos from several angles (tread, both sidewalls, valve stem) or a slow
        video circling the tire. {SHOT_TIPS[position]}
      </p>

      <div className="upload-row">
        <button
          type="button"
          className="button secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Add photos or video
        </button>
        <span className="counts">
          {photos}/{MAX_PHOTOS_PER_TIRE} photos · {videos}/{MAX_VIDEOS_PER_TIRE} videos
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.heic,.heif,.mov"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onAddFiles(position, files);
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="thumbs">
          {items.map((item) => (
            <li key={item.id} className={`thumb thumb-${item.status}`}>
              {item.frames[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/jpeg;base64,${item.frames[0].base64}`}
                  alt={`${label}: ${item.fileName}`}
                />
              ) : (
                <div className="thumb-placeholder" aria-hidden>
                  {item.status === "processing" ? "…" : item.status === "error" ? "!" : ""}
                </div>
              )}
              <div className="thumb-meta">
                <span className="thumb-name" title={item.fileName}>
                  {item.kind === "video" ? "🎬 " : ""}
                  {item.fileName}
                </span>
                {item.status === "processing" && (
                  <span className="thumb-note">{item.progress ?? "Preparing…"}</span>
                )}
                {item.status === "ready" && item.kind === "video" && (
                  <span className="thumb-note">{item.frames.length} frames sampled</span>
                )}
                {item.status === "error" && <span className="thumb-error">{item.error}</span>}
              </div>
              <button
                type="button"
                className="thumb-remove"
                aria-label={`Remove ${item.fileName}`}
                onClick={() => onRemoveItem(position, item.id)}
                disabled={busy && item.status !== "error"}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="section-actions">
        <button
          type="button"
          className="button"
          onClick={() => onAnalyze(position)}
          disabled={busy || processing}
        >
          {run.status === "analyzing" ? "Checking…" : `Check ${label.toLowerCase()} tire`}
        </button>
        {processing && <span className="hint">Preparing files…</span>}
      </div>
    </section>
  );
}
