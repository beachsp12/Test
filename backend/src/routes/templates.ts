import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { templateQueries } from '../services/database';
import type { Template } from '../types';

const router = Router();

function rowToTemplate(row: Record<string, unknown>): Template {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    createdAt: row.created_at as string,
    formType: (row.form_type as Template['formType']) ?? 'OTP',
    fields: JSON.parse((row.fields as string) ?? '{}'),
    tags: row.tags ? JSON.parse(row.tags as string) : undefined,
  };
}

/** GET /api/templates */
router.get('/', (_req: Request, res: Response) => {
  const rows = templateQueries.findAll.all() as Record<string, unknown>[];
  res.json(rows.map(rowToTemplate));
});

/** GET /api/templates/:id */
router.get('/:id', (req: Request, res: Response) => {
  const row = templateQueries.findById.get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Template not found' });
  res.json(rowToTemplate(row));
});

/** POST /api/templates — save a new template */
router.post('/', (req: Request, res: Response) => {
  const { name, description, formType = 'OTP', fields = {}, tags } = req.body as {
    name: string;
    description?: string;
    formType?: Template['formType'];
    fields?: Template['fields'];
    tags?: string[];
  };

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required' });
  }

  const id = uuidv4();
  templateQueries.insert.run({
    id,
    name,
    description: description ?? null,
    createdAt: new Date().toISOString(),
    formType,
    fields: JSON.stringify(fields),
    tags: tags ? JSON.stringify(tags) : null,
  });

  const row = templateQueries.findById.get(id) as Record<string, unknown>;
  res.status(201).json(rowToTemplate(row));
});

/** DELETE /api/templates/:id */
router.delete('/:id', (req: Request, res: Response) => {
  const row = templateQueries.findById.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Template not found' });

  templateQueries.delete.run(req.params.id);
  res.status(204).send();
});

export default router;
