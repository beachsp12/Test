import { Router, Request, Response } from 'express';
import { extractFields } from '../services/nlp';
import type { ExtractRequest } from '../types';

const router = Router();

/**
 * POST /api/extract
 * Extracts offer fields from natural language text using Claude.
 * Supports multi-turn conversation by accepting prior history.
 */
router.post('/', async (req: Request, res: Response) => {
  const { text, conversationHistory, existingFields } = req.body as ExtractRequest;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text field is required' });
  }

  try {
    const response = await extractFields({ text, conversationHistory, existingFields });
    return res.json(response);
  } catch (err) {
    console.error('NLP extraction error:', err);
    return res.status(500).json({
      error: 'Failed to extract fields. Check ANTHROPIC_API_KEY and retry.',
    });
  }
});

export default router;
