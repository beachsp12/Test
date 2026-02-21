import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import type {
  ChatMessage,
  ExtractRequest,
  ExtractResponse,
  ExtractionResult,
  OfferFields,
  ExtractionMetadata,
} from '../types';

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a real estate document assistant for a licensed agent in the Greater Boston area. \
Your job is to extract structured offer data from natural language to populate a Greater Boston Real Estate Board (GBBREB) Offer to Purchase (OTP) form.

When the user describes a transaction, extract as many fields as possible and return a JSON response \
following the exact schema below. For each field, provide a confidence score (0.0–1.0) reflecting \
how certain you are about the extracted value.

EXTRACTION SCHEMA (return exactly this JSON structure):
{
  "fields": {
    "property": {
      "streetAddress": null,
      "unit": null,
      "city": null,
      "state": "MA",
      "zip": null,
      "county": null,
      "mlsNumber": null,
      "propertyType": null
    },
    "buyer": {
      "names": [],
      "entityType": "individual",
      "address": null,
      "phone": null,
      "email": null
    },
    "seller": {
      "names": []
    },
    "financing": {
      "type": null,
      "downPaymentPercent": null,
      "loanAmount": null,
      "lenderName": null,
      "preApprovalAmount": null
    },
    "contingencies": {
      "financingContingency": null,
      "financingDeadlineDays": null,
      "inspectionContingency": null,
      "inspectionDeadlineDays": null,
      "saleContingency": false,
      "salePropertyAddress": null,
      "saleDeadlineDays": null
    },
    "terms": {
      "purchasePrice": null,
      "earnestMoneyDeposit": null,
      "earnestMoneyDueDays": 3,
      "closingDate": null,
      "closingDays": null,
      "offerExpirationDate": null,
      "offerExpirationTime": null,
      "closingCostContribution": 0,
      "personalProperty": []
    },
    "additionalTerms": null
  },
  "metadata": {
    "property.streetAddress": { "value": null, "confidence": 0, "notes": "" },
    "property.city": { "value": null, "confidence": 0, "notes": "" },
    "property.state": { "value": "MA", "confidence": 0.9, "notes": "Defaulted to MA" },
    "property.zip": { "value": null, "confidence": 0, "notes": "" },
    "buyer.names": { "value": [], "confidence": 0, "notes": "" },
    "buyer.entityType": { "value": "individual", "confidence": 0.8, "notes": "Defaulted to individual" },
    "terms.purchasePrice": { "value": null, "confidence": 0, "notes": "" },
    "terms.earnestMoneyDeposit": { "value": null, "confidence": 0, "notes": "" },
    "terms.closingDate": { "value": null, "confidence": 0, "notes": "" },
    "terms.closingDays": { "value": null, "confidence": 0, "notes": "" },
    "financing.type": { "value": null, "confidence": 0, "notes": "" },
    "contingencies.financingContingency": { "value": null, "confidence": 0, "notes": "" },
    "contingencies.inspectionContingency": { "value": null, "confidence": 0, "notes": "" }
  },
  "missingRequired": [],
  "followUpQuestion": ""
}

FIELD EXTRACTION RULES:
- purchasePrice: numeric only (no $ or commas). "850 thousand" → 850000
- earnestMoneyDeposit: numeric. If not stated, do not guess. Common range is 1–3% of purchase price.
- closingDate: ISO format YYYY-MM-DD. If "45 days" is mentioned, set closingDays instead.
- financingType: one of "conventional", "FHA", "VA", "cash", "other"
- downPaymentPercent: percentage as number (20 for 20%)
- loanAmount: if not stated but downPaymentPercent and purchasePrice are known, calculate it
- financingContingency / inspectionContingency: true/false. If cash offer, financingContingency defaults to false.
- personalProperty: array of items (e.g. ["Refrigerator", "Washer/dryer"])
- missingRequired: list the dot-paths of REQUIRED fields that are still null/empty after extraction
  Required fields: property.streetAddress, property.city, property.state, buyer.names,
  terms.purchasePrice, terms.earnestMoneyDeposit, financing.type,
  contingencies.financingContingency, contingencies.inspectionContingency
- followUpQuestion: ONE concise, friendly question asking for the single most important missing required field.
  If all required fields are present, set to "".

IMPORTANT:
- Never invent or fabricate values not stated in the user's input.
- For contingency clauses, use standard durations only if explicitly stated; otherwise leave null.
- Do not include legal boilerplate text in additionalTerms — that comes from the form itself.
- Always return valid JSON with no markdown code fences.`;

// ─── Main Extraction Function ─────────────────────────────────────────────────

export async function extractFields(req: ExtractRequest): Promise<ExtractResponse> {
  const { text, conversationHistory = [], existingFields } = req;

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user',
      content: existingFields
        ? `Current extracted fields so far:\n${JSON.stringify(existingFields, null, 2)}\n\nNew information from agent:\n${text}`
        : text,
    },
  ];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages,
  });

  const rawContent = response.content[0];
  if (rawContent.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  // Parse JSON response from Claude
  let parsed: {
    fields: OfferFields;
    metadata: ExtractionMetadata;
    missingRequired: string[];
    followUpQuestion?: string;
  };

  try {
    // Strip any accidental markdown code fences
    const cleaned = rawContent.text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${rawContent.text.substring(0, 200)}`);
  }

  const result: ExtractionResult = {
    fields: parsed.fields,
    metadata: parsed.metadata,
    missingRequired: parsed.missingRequired ?? [],
    followUpQuestion: parsed.followUpQuestion,
  };

  // Build a friendly assistant message
  const fieldCount = Object.values(parsed.metadata).filter(
    m => m.value !== null && m.value !== undefined && m.value !== ''
  ).length;

  let assistantMessage = `I've extracted ${fieldCount} field(s) from what you've described.`;

  if (parsed.missingRequired.length === 0) {
    assistantMessage +=
      ' All required fields are populated — you can proceed to review and generate your document.';
  } else if (parsed.followUpQuestion) {
    assistantMessage += ` ${parsed.followUpQuestion}`;
  }

  const updatedHistory: ChatMessage[] = [
    ...conversationHistory,
    { role: 'user', content: text },
    { role: 'assistant', content: assistantMessage },
  ];

  return { result, conversationHistory: updatedHistory, assistantMessage };
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

/**
 * Deep-merges newFields into baseFields, preferring non-null values in newFields.
 * Manual edits (source='manual') always win over NLP values.
 */
export function mergeFields(
  base: OfferFields,
  incoming: OfferFields,
): OfferFields {
  const merged = { ...base };

  for (const key of Object.keys(incoming) as Array<keyof OfferFields>) {
    const inVal = incoming[key];
    const baseVal = base[key];

    if (inVal === null || inVal === undefined) continue;

    if (typeof inVal === 'object' && !Array.isArray(inVal)) {
      merged[key] = {
        ...(typeof baseVal === 'object' && !Array.isArray(baseVal) ? baseVal : {}),
        ...inVal,
      } as never;
    } else {
      merged[key] = inVal as never;
    }
  }

  return merged;
}
