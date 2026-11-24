import { NextResponse } from "next/server";
import { API_KEY_ENV_VAR, MISSING_KEY_MESSAGE, MODEL, getApiKey } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets the page warn up front when the API key is missing. Never returns the key. */
export async function GET() {
  const configured = getApiKey() !== null;
  return NextResponse.json({
    apiKeyConfigured: configured,
    envVar: API_KEY_ENV_VAR,
    model: MODEL,
    message: configured ? null : MISSING_KEY_MESSAGE,
  });
}
