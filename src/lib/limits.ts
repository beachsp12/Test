/** Limits shared by the browser (upload checks) and the server (request checks). */

export const MAX_PHOTOS_PER_TIRE = 10;
export const MAX_VIDEOS_PER_TIRE = 2;
/** Frames pulled from each video, spread evenly from start to end. */
export const FRAMES_PER_VIDEO = 10;
/** Smallest gap between sampled frames, so very short clips get fewer frames. */
export const MIN_FRAME_SPACING_SECONDS = 0.3;

export const MAX_PHOTO_BYTES = 30 * 1024 * 1024; // 30 MB original photo
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // 250 MB original video
export const MAX_VIDEO_SECONDS = 180; // 3 minutes

/** Long edge in pixels for photos and frames sent to the model. */
export const IMAGE_MAX_EDGE = 1568;
export const JPEG_QUALITY = 0.85;

/** Server-side guards. */
export const MAX_IMAGES_PER_REQUEST =
  MAX_PHOTOS_PER_TIRE + MAX_VIDEOS_PER_TIRE * FRAMES_PER_VIDEO;
/** The vision API rejects single base64 images above 5 MB. */
export const MAX_IMAGE_BASE64_CHARS = 5 * 1024 * 1024;

export const PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];
export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];
export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "m4v"];

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} bytes`;
}
