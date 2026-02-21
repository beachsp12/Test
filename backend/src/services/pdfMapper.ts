/**
 * PDF Form Field Mapper
 *
 * Handles two operations:
 *   1. inspectPdf(buffer)   — reads an uploaded GBBREB PDF and returns all AcroForm field names
 *   2. fillPdf(buffer, map) — fills a GBBREB PDF using a saved field mapping + offer data
 *
 * Once you upload a real GBBREB PDF and map its fields to the OfferFields schema,
 * the app will use fillPdf() to produce a pixel-perfect completed form instead of the
 * generated layout produced by pdf.ts.
 */

import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import type { OfferFields } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'unknown';

export interface InspectedField {
  name: string;
  type: FieldType;
  currentValue: string | boolean | null;
  options?: string[];          // for dropdown/radio
  suggestedMapping?: string;   // auto-suggested OfferFields path
}

export interface FieldMapping {
  pdfFieldName: string;
  schemaPath: string;           // dot-path into OfferFields (e.g. "terms.purchasePrice")
  transform?: 'currency' | 'date' | 'percent' | 'array_join' | 'boolean_yn' | 'boolean_check';
  // For checkboxes that represent one option of a multi-choice group:
  checkValue?: string;          // e.g. "conventional" — checkbox checked when field equals this
}

export interface FormTemplate {
  id: string;
  formType: string;             // e.g. "OTP", "PS", "BRA"
  formTitle: string;
  formVersion: string;
  mappings: FieldMapping[];
}

// ─── Inspect PDF ─────────────────────────────────────────────────────────────

/**
 * Reads all AcroForm fields from an uploaded PDF and returns metadata.
 * Use this to discover the PDF's field names before creating a mapping.
 */
export async function inspectPdf(buffer: Buffer): Promise<InspectedField[]> {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const form = doc.getForm();
  const fields = form.getFields();

  return fields.map(field => {
    const name = field.getName();

    if (field instanceof PDFTextField) {
      return {
        name,
        type: 'text' as FieldType,
        currentValue: field.getText() ?? null,
        suggestedMapping: suggestMapping(name),
      };
    }

    if (field instanceof PDFCheckBox) {
      return {
        name,
        type: 'checkbox' as FieldType,
        currentValue: field.isChecked(),
        suggestedMapping: suggestMapping(name),
      };
    }

    if (field instanceof PDFDropdown) {
      return {
        name,
        type: 'dropdown' as FieldType,
        currentValue: field.getSelected()[0] ?? null,
        options: field.getOptions(),
        suggestedMapping: suggestMapping(name),
      };
    }

    if (field instanceof PDFRadioGroup) {
      return {
        name,
        type: 'radio' as FieldType,
        currentValue: field.getSelected() ?? null,
        options: field.getOptions(),
        suggestedMapping: suggestMapping(name),
      };
    }

    return { name, type: 'unknown' as FieldType, currentValue: null };
  });
}

// ─── Fill PDF ─────────────────────────────────────────────────────────────────

/**
 * Fills a GBBREB PDF using a saved field mapping and offer data.
 * Returns the filled PDF as a Buffer.
 */
export async function fillPdf(
  pdfBuffer: Buffer,
  template: FormTemplate,
  fields: OfferFields,
  flatten = false,
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const form = doc.getForm();

  for (const mapping of template.mappings) {
    const rawValue = getNestedValue(fields as Record<string, unknown>, mapping.schemaPath);
    if (rawValue === null || rawValue === undefined) continue;

    const displayValue = applyTransform(rawValue, mapping.transform);

    try {
      const field = form.getField(mapping.pdfFieldName);

      if (field instanceof PDFTextField) {
        field.setText(displayValue);
      } else if (field instanceof PDFCheckBox) {
        const shouldCheck =
          mapping.checkValue !== undefined
            ? String(rawValue) === mapping.checkValue
            : rawValue === true || rawValue === 'true';
        shouldCheck ? field.check() : field.uncheck();
      } else if (field instanceof PDFDropdown) {
        try { field.select(displayValue); } catch { /* value not in options */ }
      } else if (field instanceof PDFRadioGroup) {
        try { field.select(displayValue); } catch { /* value not in options */ }
      }
    } catch {
      // Field not found in PDF — skip silently (mapping may reference a field
      // that only exists in a newer form version)
      console.warn(`PDF field not found: ${mapping.pdfFieldName}`);
    }
  }

  if (flatten) {
    form.flatten();
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function applyTransform(value: unknown, transform?: string): string {
  if (value === null || value === undefined) return '';

  switch (transform) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(value));

    case 'date':
      try {
        return new Date(String(value) + 'T00:00:00').toLocaleDateString('en-US', {
          month: '2-digit', day: '2-digit', year: 'numeric',
        });
      } catch { return String(value); }

    case 'percent':
      return `${value}%`;

    case 'array_join':
      return Array.isArray(value) ? value.join(', ') : String(value);

    case 'boolean_yn':
      return value === true ? 'Yes' : value === false ? 'No' : '';

    case 'boolean_check':
      return value === true ? 'X' : '';

    default:
      return String(value);
  }
}

/**
 * Heuristic: guesses an OfferFields schema path from a PDF field name.
 * Used to pre-populate the mapping UI — agent can confirm or override.
 */
function suggestMapping(fieldName: string): string | undefined {
  const lower = fieldName.toLowerCase();

  const heuristics: Array<[RegExp, string]> = [
    [/buyer.*name|name.*buyer/i, 'buyer.names'],
    [/seller.*name|name.*seller/i, 'seller.names'],
    [/purchase.*price|offer.*price|sale.*price/i, 'terms.purchasePrice'],
    [/earnest|deposit/i, 'terms.earnestMoneyDeposit'],
    [/closing.*date|close.*date/i, 'terms.closingDate'],
    [/street.*addr|property.*addr|premises/i, 'property.streetAddress'],
    [/city|town/i, 'property.city'],
    [/state/i, 'property.state'],
    [/zip|postal/i, 'property.zip'],
    [/mls/i, 'property.mlsNumber'],
    [/financing.*type|loan.*type|mortgage.*type/i, 'financing.type'],
    [/down.*payment|down.*pct/i, 'financing.downPaymentPercent'],
    [/lender|bank/i, 'financing.lenderName'],
    [/loan.*amount|mortgage.*amount/i, 'financing.loanAmount'],
    [/financing.*contingency|mortgage.*contingency/i, 'contingencies.financingContingency'],
    [/inspection.*contingency|home.*inspection/i, 'contingencies.inspectionContingency'],
    [/sale.*contingency/i, 'contingencies.saleContingency'],
    [/expir/i, 'terms.offerExpirationDate'],
    [/county/i, 'property.county'],
    [/unit|apt|suite/i, 'property.unit'],
  ];

  for (const [pattern, path] of heuristics) {
    if (pattern.test(lower)) return path;
  }

  return undefined;
}
