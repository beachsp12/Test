/**
 * Form Template routes — upload and manage GBBREB PDF templates with field mappings.
 *
 * Workflow:
 *   1. POST /api/form-templates/upload    — upload a blank GBBREB PDF
 *   2. GET  /api/documents/inspect-pdf    — inspect its fields (returns suggestedMapping)
 *   3. POST /api/form-templates/:type/mappings — save the confirmed field mappings
 *   4. Subsequent PDF generations for that form type will use the real GBBREB PDF
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { formTemplateQueries } from '../services/formTemplates';
import type { FieldMapping } from '../services/pdfMapper';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/** GET /api/form-templates — list all uploaded form templates (no PDF data) */
router.get('/', (_req: Request, res: Response) => {
  const rows = formTemplateQueries.findAll.all() as Record<string, unknown>[];
  res.json(
    rows.map(r => ({
      id: r.id,
      formType: r.form_type,
      formTitle: r.form_title,
      formVersion: r.form_version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
});

/**
 * POST /api/form-templates/upload
 * Upload a blank GBBREB PDF and register it as a form template.
 *
 * Body (multipart/form-data):
 *   pdf         — the blank PDF file
 *   formType    — "OTP" | "PS" | "BRA" | ...
 *   formTitle   — human-readable title
 *   formVersion — optional version string (e.g. "2024")
 */
router.post(
  '/upload',
  upload.single('pdf'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No PDF file provided' });

    const { formType, formTitle, formVersion } = req.body as {
      formType?: string;
      formTitle?: string;
      formVersion?: string;
    };

    if (!formType || !formTitle) {
      return res.status(400).json({ error: 'formType and formTitle are required' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    formTemplateQueries.upsert.run({
      id,
      formType,
      formTitle,
      formVersion: formVersion ?? null,
      createdAt: now,
      updatedAt: now,
      pdfData: req.file.buffer,
      mappings: '[]',
    });

    res.status(201).json({
      id,
      formType,
      formTitle,
      formVersion,
      message: `PDF uploaded. Now POST /api/documents/inspect-pdf with the same PDF to get field names, then save mappings via PUT /api/form-templates/${formType}/mappings`,
    });
  }
);

/**
 * PUT /api/form-templates/:formType/mappings
 * Save or replace the field mappings for a form template.
 *
 * Body: { mappings: FieldMapping[] }
 */
router.put('/:formType/mappings', (req: Request, res: Response) => {
  const { mappings } = req.body as { mappings: FieldMapping[] };

  if (!Array.isArray(mappings)) {
    return res.status(400).json({ error: 'mappings must be an array of FieldMapping objects' });
  }

  const existing = formTemplateQueries.findByFormType.get(req.params.formType);
  if (!existing) {
    return res.status(404).json({ error: `No uploaded PDF found for form type "${req.params.formType}"` });
  }

  formTemplateQueries.updateMappings.run({
    formType: req.params.formType,
    mappings: JSON.stringify(mappings),
    updatedAt: new Date().toISOString(),
  });

  res.json({
    formType: req.params.formType,
    mappingCount: mappings.length,
    message: 'Mappings saved. Documents generated for this form type will now use the real GBBREB PDF.',
  });
});

/** DELETE /api/form-templates/:formType */
router.delete('/:formType', (req: Request, res: Response) => {
  const existing = formTemplateQueries.findByFormType.get(req.params.formType);
  if (!existing) return res.status(404).json({ error: 'Form template not found' });

  formTemplateQueries.delete.run(req.params.formType);
  res.status(204).send();
});

export default router;
