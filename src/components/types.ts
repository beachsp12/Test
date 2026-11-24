import type { FileKind, PreparedFrame } from "@/lib/media";
import type { TireResult } from "@/lib/schema";

export type MediaItem = {
  id: string;
  fileName: string;
  kind: FileKind | "unsupported";
  status: "processing" | "ready" | "error";
  progress?: string;
  error?: string;
  frames: PreparedFrame[];
  durationSec?: number;
};

export type RunState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "done"; result: TireResult }
  | { status: "error"; message: string }
  | { status: "skipped"; message: string };
