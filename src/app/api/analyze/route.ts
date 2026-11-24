import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { MISSING_KEY_MESSAGE, MODEL, getApiKey, getClient } from "@/lib/anthropic";
import { MAX_IMAGES_PER_REQUEST, MAX_IMAGE_BASE64_CHARS } from "@/lib/limits";
import { finalizeResult } from "@/lib/postprocess";
import { SYSTEM_PROMPT, buildIntro, buildOutro } from "@/lib/prompt";
import {
  AnalyzeRequestSchema,
  ModelAnalysisSchema,
  type ApiError,
  type TireResult,
} from "@/lib/schema";
import { TIRE_DESCRIPTIONS, TIRE_LABELS } from "@/lib/tires";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fail(status: number, code: string, message: string) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status });
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export async function POST(request: Request) {
  // 1. API key must be configured on the server.
  const apiKey = getApiKey();
  if (!apiKey) return fail(500, "missing_api_key", MISSING_KEY_MESSAGE);

  // 2. Parse and validate the request.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_request", "The upload couldn't be read. Try again.");
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "bad_request", "The upload was in an unexpected format. Refresh the page and try again.");
  }

  const { position, images } = parsed.data;
  const tireLabel = TIRE_LABELS[position];

  if (images.length === 0) {
    return fail(400, "no_files", `${tireLabel}: no photos or video to check.`);
  }
  if (images.length > MAX_IMAGES_PER_REQUEST) {
    return fail(
      400,
      "too_many_images",
      `${tireLabel}: too many images (${images.length}). The limit is ${MAX_IMAGES_PER_REQUEST}, counting video frames.`,
    );
  }
  for (const img of images) {
    if (img.data.length > MAX_IMAGE_BASE64_CHARS) {
      return fail(413, "image_too_large", `${tireLabel}: "${img.label}" is too large after compression. Try a smaller photo.`);
    }
    if (!BASE64_RE.test(img.data)) {
      return fail(400, "bad_image", `${tireLabel}: "${img.label}" isn't a valid image.`);
    }
  }

  // 3. Build one message that tags every image with its tire.
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    {
      type: "text",
      text: buildIntro(
        tireLabel,
        TIRE_DESCRIPTIONS[position],
        images.length,
        images.some((i) => i.kind === "video_frame"),
      ),
    },
  ];
  for (const img of images) {
    content.push({ type: "text", text: `[${tireLabel} tire] ${img.label}` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    });
  }
  content.push({ type: "text", text: buildOutro(tireLabel) });

  // 4. Call the vision model.
  const client = getClient(apiKey);
  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "high",
        format: zodOutputFormat(ModelAnalysisSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
  } catch (error) {
    return handleApiError(error, tireLabel);
  }

  if (response.stop_reason === "refusal") {
    return fail(502, "model_declined", `${tireLabel}: the vision model declined to analyze these files. Try different photos.`);
  }
  if (response.stop_reason === "max_tokens") {
    return fail(502, "model_incomplete", `${tireLabel}: the analysis was cut off before it finished. Try again with fewer files.`);
  }
  const analysis = response.parsed_output;
  if (!analysis) {
    return fail(502, "model_bad_output", `${tireLabel}: the vision model's answer couldn't be read. Try again.`);
  }

  const result: TireResult = finalizeResult(position, analysis, images.length);
  return NextResponse.json(result);
}

function handleApiError(error: unknown, tireLabel: string) {
  console.error(`[analyze] ${tireLabel} failed:`, error);
  if (error instanceof Anthropic.AuthenticationError) {
    return fail(500, "bad_api_key", "The API key in ANTHROPIC_API_KEY was rejected. Check that it's correct and active, then restart the dev server.");
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return fail(500, "permission_denied", "Your API key doesn't have access to this model. Check your Anthropic account.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return fail(429, "rate_limited", `${tireLabel}: too many requests right now. Wait a minute and try this tire again.`);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return fail(400, "api_rejected", `${tireLabel}: the vision service rejected the request (${error.message}). Try fewer or smaller files.`);
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return fail(504, "timeout", `${tireLabel}: the analysis took too long. Try again with fewer files.`);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return fail(502, "connection_error", `${tireLabel}: couldn't reach the vision service. Check your internet connection and try again.`);
  }
  if (error instanceof Anthropic.APIError) {
    return fail(502, "api_error", `${tireLabel}: the vision service returned an error (${error.status ?? "unknown"}). Try again in a moment.`);
  }
  return fail(500, "unknown_error", `${tireLabel}: something went wrong on the server. Try again.`);
}
