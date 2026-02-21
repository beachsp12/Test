import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { offerQueries, documentQueries } from '../services/database';
import { generateOTPPdf } from '../services/pdf';
import { fillPdf, inspectPdf } from '../services/pdfMapper';
import { formTemplateQueries } from '../services/formTemplates';
import type { OfferFields } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Generate PDF for an offer ────────────────────────────────────────────────

/**
 * POST /api/documents/generate/:offerId
 *
 * Generates (or regenerates) a PDF for the given offer.
 * If a mapped GBBREB PDF template exists for the form type, uses that.
 * Otherwise falls back to the generated layout.
 *
 * Query params:
 *   ?final=true  — removes DRAFT watermark and sets status to 'final'
 */
router.post('/generate/:offerId', async (req: Request, res: Response) => {
  const offer = offerQueries.findById.get(req.params.offerId) as Record<string, unknown> | undefined;
  if (!offer) return res.status(404).json({ error: 'Offer not found' });

  const isFinal = req.query.final === 'true';
  const fields: OfferFields = JSON.parse(offer.fields as string);

  try {
    let pdfBuffer: Buffer;

    // Try to use a mapped GBBREB template PDF first
    const mappedTemplate = formTemplateQueries.findByFormType.get(
      offer.form_type as string
    ) as Record<string, unknown> | null;

    if (mappedTemplate && mappedTemplate.pdf_data) {
      const templatePdf = Buffer.from(mappedTemplate.pdf_data as Buffer);
      const mappings = JSON.parse(mappedTemplate.mappings as string);
      pdfBuffer = await fillPdf(templatePdf, { ...mappedTemplate, mappings } as never, fields, isFinal);
    } else {
      // Fallback: generated OTP layout
      pdfBuffer = await generateOTPPdf(fields, !isFinal);
    }

    // Get next version number
    const versionRow = documentQueries.getNextVersion.get(req.params.offerId) as { next: number };
    const version = versionRow.next;
    const docId = uuidv4();

    documentQueries.insert.run({
      id: docId,
      offerId: req.params.offerId,
      version,
      createdAt: new Date().toISOString(),
      pdfData: pdfBuffer,
      status: isFinal ? 'final' : 'draft',
      watermarked: isFinal ? 0 : 1,
    });

    // Update offer status
    offerQueries.update.run({
      id: req.params.offerId,
      name: offer.name,
      updatedAt: new Date().toISOString(),
      status: isFinal ? 'final' : 'review',
      fields: offer.fields,
      metadata: offer.metadata ?? null,
      notes: offer.notes ?? null,
    });

    res.json({
      documentId: docId,
      version,
      status: isFinal ? 'final' : 'draft',
      message: isFinal ? 'Final document generated' : 'Draft document generated',
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

/** GET /api/documents/:docId/pdf — stream PDF bytes */
router.get('/:docId/pdf', (req: Request, res: Response) => {
  const doc = documentQueries.findById.get(req.params.docId) as Record<string, unknown> | undefined;
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const pdfData = doc.pdf_data as Buffer;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="offer-v${doc.version}.pdf"`
  );
  res.send(pdfData);
});

/** GET /api/documents/offer/:offerId — list documents for an offer */
router.get('/offer/:offerId', (req: Request, res: Response) => {
  const rows = documentQueries.findByOfferId.all(req.params.offerId) as Record<string, unknown>[];
  res.json(rows.map(r => ({
    id: r.id,
    offerId: r.offer_id,
    version: r.version,
    createdAt: r.created_at,
    status: r.status,
    watermarked: r.watermarked === 1,
  })));
});

// ─── GBBREB PDF Upload & Field Inspection ─────────────────────────────────────

/**
 * POST /api/documents/inspect-pdf
 * Upload a GBBREB PDF form and get back all its AcroForm field names.
 * Use the returned field list to create a field mapping.
 */
router.post(
  '/inspect-pdf',
  upload.single('pdf'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    try {
      const fields = await inspectPdf(req.file.buffer);
      res.json({
        fieldCount: fields.length,
        fields,
        message: `Found ${fields.length} form fields. Review the suggestedMapping for each field, then POST to /api/form-templates to save the mapping.`,
      });
    } catch (err) {
      console.error('PDF inspection error:', err);
      res.status(400).json({ error: 'Could not parse PDF. Ensure it is a valid fillable PDF form.' });
    }
  }
);

export default router;
