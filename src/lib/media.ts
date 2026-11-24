/**
 * Browser-only helpers: shrink photos and pull evenly spaced frames from
 * videos. Everything happens on the user's device; videos are never uploaded,
 * only the sampled frames are.
 */
import {
  FRAMES_PER_VIDEO,
  IMAGE_MAX_EDGE,
  JPEG_QUALITY,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MIN_FRAME_SPACING_SECONDS,
  PHOTO_EXTENSIONS,
  PHOTO_MIME_TYPES,
  VIDEO_EXTENSIONS,
  VIDEO_MIME_TYPES,
  formatBytes,
} from "./limits";

export class MediaError extends Error {}

export type FileKind = "photo" | "video";

export type PreparedFrame = {
  /** Base64 JPEG without the data: prefix. */
  base64: string;
  /** Seconds into the video, or null for photos. */
  timestampSec: number | null;
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Decide whether a file is a photo or a video, or reject it with a clear reason. */
export function classifyFile(file: File): FileKind {
  const type = file.type.toLowerCase();
  const ext = extensionOf(file.name);

  const isPhoto =
    PHOTO_MIME_TYPES.includes(type) || (!type && PHOTO_EXTENSIONS.includes(ext));
  const isVideo =
    VIDEO_MIME_TYPES.includes(type) || (!type && VIDEO_EXTENSIONS.includes(ext));

  if (isPhoto) {
    if (file.size > MAX_PHOTO_BYTES) {
      throw new MediaError(
        `This photo is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_PHOTO_BYTES)}.`,
      );
    }
    return "photo";
  }
  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new MediaError(
        `This video is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_VIDEO_BYTES)}. Trim it or record a shorter clip (under ${MAX_VIDEO_SECONDS / 60} minutes).`,
      );
    }
    return "video";
  }
  throw new MediaError(
    `This file type${type ? ` (${type})` : ""} isn't supported. Use JPG, PNG, WebP or HEIC photos, or MP4, MOV or WebM videos.`,
  );
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
): string {
  const size = scaledSize(width, height, IMAGE_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("Your browser couldn't process this image.");
  ctx.drawImage(source, 0, 0, size.width, size.height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new MediaError("Your browser couldn't process this image.");
  return base64;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
}

/** Resize a photo to JPEG. Throws MediaError with a plain-language reason. */
export async function preparePhoto(file: File): Promise<PreparedFrame> {
  const heicHint =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
      ? " iPhone HEIC photos only open in some browsers (Safari works). Either use Safari, or set your iPhone to Settings > Camera > Formats > Most Compatible and retake."
      : "";

  try {
    const bitmap = await createImageBitmap(file);
    try {
      return { base64: drawToJpeg(bitmap, bitmap.width, bitmap.height), timestampSec: null };
    } finally {
      bitmap.close();
    }
  } catch (err) {
    if (err instanceof MediaError) throw err;
    // Fall back to an <img> element, which some browsers decode differently.
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(url);
      return {
        base64: drawToJpeg(img, img.naturalWidth, img.naturalHeight),
        timestampSec: null,
      };
    } catch (err2) {
      if (err2 instanceof MediaError) throw err2;
      throw new MediaError(`Your browser couldn't open this photo.${heicHint}`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function waitForEvent(
  el: HTMLVideoElement,
  event: "loadedmetadata" | "seeked" | "loadeddata",
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new MediaError("timeout"));
    }, timeoutMs);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new MediaError("decode"));
    };
    function cleanup() {
      window.clearTimeout(timer);
      el.removeEventListener(event, onOk);
      el.removeEventListener("error", onErr);
    }
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });
}

async function seekTo(video: HTMLVideoElement, time: number) {
  const done = waitForEvent(video, "seeked", 15000);
  video.currentTime = time;
  await done;
}

/** Some WebM files report Infinity until the browser scans to the end. */
async function resolveDuration(video: HTMLVideoElement): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;
  await seekTo(video, 1e7).catch(() => undefined);
  const d = video.duration;
  await seekTo(video, 0).catch(() => undefined);
  return Number.isFinite(d) ? d : 0;
}

/** Frame times spread evenly across the whole clip (midpoints of N equal slices). */
export function frameTimes(duration: number): number[] {
  const count = Math.max(
    1,
    Math.min(FRAMES_PER_VIDEO, Math.floor(duration / MIN_FRAME_SPACING_SECONDS)),
  );
  return Array.from({ length: count }, (_, i) =>
    Math.min(duration - 0.05, ((i + 0.5) * duration) / count),
  ).map((t) => Math.max(0, t));
}

const UNREADABLE_VIDEO =
  "Your browser couldn't play this video. iPhone videos are often HEVC, which Chrome and Firefox may not open. Try Safari, or set your iPhone to Settings > Camera > Formats > Most Compatible, or export the clip as MP4.";

/** Pull evenly spaced frames from a video so the whole tire surface is covered. */
export async function prepareVideo(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ frames: PreparedFrame[]; durationSec: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  try {
    const meta = waitForEvent(video, "loadedmetadata", 20000);
    video.src = url;
    try {
      await meta;
    } catch {
      throw new MediaError(UNREADABLE_VIDEO);
    }

    const duration = await resolveDuration(video);
    if (!duration) throw new MediaError(UNREADABLE_VIDEO);
    if (duration > MAX_VIDEO_SECONDS) {
      throw new MediaError(
        `This video is ${Math.round(duration)} seconds long. The limit is ${MAX_VIDEO_SECONDS / 60} minutes. Trim it, or record a slower, shorter walk-around of just this tire.`,
      );
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new MediaError(UNREADABLE_VIDEO);
    }

    const times = frameTimes(duration);
    const frames: PreparedFrame[] = [];
    for (let i = 0; i < times.length; i++) {
      try {
        await seekTo(video, times[i]);
      } catch {
        throw new MediaError(UNREADABLE_VIDEO);
      }
      frames.push({
        base64: drawToJpeg(video, video.videoWidth, video.videoHeight),
        timestampSec: times[i],
      });
      onProgress?.(i + 1, times.length);
    }
    return { frames, durationSec: duration };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export function formatTimestamp(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
