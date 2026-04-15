/**
 * Market Report routes
 *
 * Workflow:
 *   1. POST /api/market-reports/extract          — paste another brokerage’s report text, Claude extracts stats
 *   2. POST /api/market-reports/preview          — generate a preview PDF from fields (no save)
 *   3. POST /api/market-reports                  — save a report
 *   4. POST /api/market-reports/:id/pdf          — download E&V branded PDF for saved report
 *   5. GET/POST/DELETE /api/market-reports/templates  — manage reusable report templates
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { marketReportQueries, marketReportTemplateQueries } from '../services/database';
import { generateMarketReportPdf } from '../services/marketReportPdf';
import type { MarketReportFields } from '../services/marketReportPdf';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_SYSTEM = `You are a real estate data extractor. Extract market statistics from the provided text and return JSON matching this exact schema. Return ONLY valid JSON with no markdown fences.

{
  "marketArea": "",
  "reportPeriod": "",
  "propertyType": "",
  "stats": {
    "activeListings": null,
    "newListings": null,
    "closedSales": null,
    "avgDaysOnMarket": null,
    "medianSalePrice": null,
    "avgSalePrice": null,
    "listToSaleRatio": null,
    "monthsOfSupply": null,
    "medianSalePriceYoY": null,
    "avgSalePriceYoY": null
  },
  "priceRanges": []
}

Rules:
- All prices as raw numbers (no $ or commas). "$450K" -> 450000, "$1.2M" -> 1200000
- listToSaleRatio as decimal: "98.5%" -> 0.985
- YoY as percent change number: "+5.2%" -> 5.2, "-3.1%" -> -3.1
- If a value is absent, use null
- priceRanges: array of { "range": "...", "count": N, "pctOfTotal": N } only when data is present`;

// ─── Static routes first (must precede /:id catch-alls) ───────────────────────

/** POST /api/market-reports/extract — AI extraction from pasted text */
router.post('/extract', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: text }],
    });

    const raw = response.content[0];
    if (raw.type !== 'text') return res.status(500).json({ error: 'Unexpected Claude response type' });

    const cleaned = raw.text
      .replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();
    const extracted = JSON.parse(cleaned);
    res.json({ extracted });
  } catch (err) {
    console.error('Market report extraction error:', err);
    res.status(500).json({ error: 'Extraction failed', detail: String(err) });
  }
});

/** POST /api/market-reports/preview — generate PDF inline without saving */
router.post('/preview', async (req: Request, res: Response) => {
  const { fields } = req.body as { fields?: MarketReportFields };
  if (!fields) return res.status(400).json({ error: 'fields is required' });

  try {
    const pdf = await generateMarketReportPdf(fields);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="ev-market-report-preview.pdf"',
      'Content-Length': String(pdf.length),
    });
    res.send(pdf);
  } catch (err) {
    console.error('PDF preview error:', err);
    res.status(500).json({ error: 'PDF generation failed', detail: String(err) });
  }
});

/** GET /api/market-reports/templates — list all saved templates */
router.get('/templates', (_req: Request, res: Response) => {
  const rows = marketReportTemplateQueries.findAll.all() as Record<string, unknown>[];
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
    fields: JSON.parse(r.fields as string),
    tags: r.tags ? JSON.parse(r.tags as string) : [],
  })));
});

/** POST /api/market-reports/templates — save a new template */
router.post('/templates', (req: Request, res: Response) => {
  const { name, description, fields, tags } = req.body as {
    name: string;
    description?: string;
    fields: Partial<MarketReportFields>;
    tags?: string[];
  };
  if (!name || !fields) return res.status(400).json({ error: 'name and fields are required' });

  const id  = uuidv4();
  const now = new Date().toISOString();
  marketReportTemplateQueries.insert.run({
    id,
    name,
    description: description ?? null,
    createdAt:   now,
    fields:      JSON.stringify(fields),
    tags:        tags ? JSON.stringify(tags) : null,
  });

  res.status(201).json({ id, name, description, createdAt: now, fields, tags: tags ?? [] });
});

/** DELETE /api/market-reports/templates/:id */
router.delete('/templates/:id', (req: Request, res: Response) => {
  const existing = marketReportTemplateQueries.findById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Template not found' });
  marketReportTemplateQueries.delete.run(req.params.id);
  res.status(204).send();
});

// ─── Market Report CRUD (‘/:id’ routes — must follow static routes) ────────────

/** GET /api/market-reports — list all saved reports */
router.get('/', (_req: Request, res: Response) => {
  const rows = marketReportQueries.findAll.all() as Record<string, unknown>[];
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    fields: JSON.parse(r.fields as string),
  })));
});

/** POST /api/market-reports — create and save a report */
router.post('/', (req: Request, res: Response) => {
  const { name, fields } = req.body as { name?: string; fields: MarketReportFields };
  if (!fields) return res.status(400).json({ error: 'fields is required' });

  const id  = uuidv4();
  const now = new Date().toISOString();
  marketReportQueries.insert.run({
    id,
    name:      name ?? `${fields.marketArea} – ${fields.reportPeriod}`,
    createdAt: now,
    updatedAt: now,
    fields:    JSON.stringify(fields),
  });

  res.status(201).json({ id, name, createdAt: now, updatedAt: now, fields });
});

/** PUT /api/market-reports/:id */
router.put('/:id', (req: Request, res: Response) => {
  const row = marketReportQueries.findById.get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Market report not found' });

  const { name, fields } = req.body as { name?: string; fields?: MarketReportFields };
  const now = new Date().toISOString();
  marketReportQueries.update.run({
    id:        req.params.id,
    name:      name ?? row.name,
    updatedAt: now,
    fields:    fields ? JSON.stringify(fields) : row.fields,
  });

  res.json({ id: req.params.id, updatedAt: now });
});

/** DELETE /api/market-reports/:id */
router.delete('/:id', (req: Request, res: Response) => {
  const existing = marketReportQueries.findById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Market report not found' });
  marketReportQueries.delete.run(req.params.id);
  res.status(204).send();
});

/** POST /api/market-reports/:id/pdf — download E&V branded PDF */
router.post('/:id/pdf', async (req: Request, res: Response) => {
  const row = marketReportQueries.findById.get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Market report not found' });

  try {
    const fields: MarketReportFields = JSON.parse(row.fields as string);
    const pdf = await generateMarketReportPdf(fields);
    const slug = `${(fields.marketArea || 'report').replace(/\s+/g, '-').toLowerCase()}-${(fields.reportPeriod || '').replace(/\s+/g, '-').toLowerCase()}`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ev-market-report-${slug}.pdf"`,
      'Content-Length': String(pdf.length),
    });
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed', detail: String(err) });
  }
});

export default router;
