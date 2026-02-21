import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { offerQueries } from '../services/database';
import type { Offer, OfferFields, OfferStatus } from '../types';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToOffer(row: Record<string, unknown>): Offer {
  return {
    id: row.id as string,
    name: row.name as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    status: row.status as OfferStatus,
    formType: (row.form_type as Offer['formType']) ?? 'OTP',
    fields: JSON.parse((row.fields as string) ?? '{}'),
    extractionMetadata: row.metadata
      ? JSON.parse(row.metadata as string)
      : undefined,
    notes: row.notes as string | undefined,
  };
}

function deriveOfferName(fields: OfferFields): string {
  const addr = fields.property?.streetAddress ?? '';
  const city = fields.property?.city ?? '';
  const buyers = fields.buyer?.names?.join(' & ') ?? '';
  const parts = [addr, city, buyers ? `– ${buyers}` : ''].filter(Boolean);
  return parts.join(', ') || 'Untitled Offer';
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/offers — list all offers */
router.get('/', (_req: Request, res: Response) => {
  const rows = offerQueries.findAll.all() as Record<string, unknown>[];
  res.json(rows.map(rowToOffer));
});

/** GET /api/offers/:id — get single offer */
router.get('/:id', (req: Request, res: Response) => {
  const row = offerQueries.findById.get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Offer not found' });
  res.json(rowToOffer(row));
});

/** POST /api/offers — create new offer */
router.post('/', (req: Request, res: Response) => {
  const { fields = {}, notes, metadata, status = 'draft', formType = 'OTP' } = req.body as {
    fields?: OfferFields;
    notes?: string;
    metadata?: unknown;
    status?: OfferStatus;
    formType?: Offer['formType'];
  };

  const now = new Date().toISOString();
  const id = uuidv4();
  const name = deriveOfferName(fields);

  offerQueries.insert.run({
    id,
    name,
    createdAt: now,
    updatedAt: now,
    status,
    formType,
    fields: JSON.stringify(fields),
    metadata: metadata ? JSON.stringify(metadata) : null,
    notes: notes ?? null,
  });

  const row = offerQueries.findById.get(id) as Record<string, unknown>;
  res.status(201).json(rowToOffer(row));
});

/** PUT /api/offers/:id — update offer */
router.put('/:id', (req: Request, res: Response) => {
  const existing = offerQueries.findById.get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) return res.status(404).json({ error: 'Offer not found' });

  const { fields, notes, metadata, status } = req.body as {
    fields?: OfferFields;
    notes?: string;
    metadata?: unknown;
    status?: OfferStatus;
  };

  const mergedFields = fields
    ? JSON.stringify(fields)
    : (existing.fields as string);

  const name = fields ? deriveOfferName(fields) : (existing.name as string);

  offerQueries.update.run({
    id: req.params.id,
    name,
    updatedAt: new Date().toISOString(),
    status: status ?? existing.status,
    fields: mergedFields,
    metadata: metadata ? JSON.stringify(metadata) : (existing.metadata ?? null),
    notes: notes ?? existing.notes ?? null,
  });

  const updated = offerQueries.findById.get(req.params.id) as Record<string, unknown>;
  res.json(rowToOffer(updated));
});

/** DELETE /api/offers/:id — delete offer */
router.delete('/:id', (req: Request, res: Response) => {
  const existing = offerQueries.findById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Offer not found' });

  offerQueries.delete.run(req.params.id);
  res.status(204).send();
});

export default router;
