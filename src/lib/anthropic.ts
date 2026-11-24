import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const API_KEY_ENV_VAR = "ANTHROPIC_API_KEY";
export const MODEL = "claude-opus-5-5";

export const MISSING_KEY_MESSAGE = `The app can't reach the vision model because ${API_KEY_ENV_VAR} isn't set. Add it to a file named .env.local in the project folder (copy .env.example), then stop and restart "npm run dev".`;

export function getApiKey(): string | null {
  const key = process.env[API_KEY_ENV_VAR]?.trim();
  return key ? key : null;
}

let client: Anthropic | null = null;

export function getClient(apiKey: string): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey, maxRetries: 2, timeout: 5 * 60 * 1000 });
  }
  return client;
}
