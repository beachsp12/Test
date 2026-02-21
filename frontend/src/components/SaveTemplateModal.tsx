import { useState } from 'react';
import type { OfferFields } from '../types';
import { createTemplate } from '../api';

interface Props {
  fields: OfferFields;
  onSaved: () => void;
  onClose: () => void;
}

/** Strips buyer-specific PII from fields before saving as a template */
function sanitizeForTemplate(fields: OfferFields): Partial<OfferFields> {
  return {
    ...fields,
    buyer: {
      entityType: fields.buyer?.entityType,
      // Strip names, address, phone, email
    },
    seller: undefined,
    agentNotes: undefined,
  };
}

export default function SaveTemplateModal({ fields, onSaved, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required'); return; }
    setSaving(true);
    try {
      await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        formType: 'OTP',
        fields: sanitizeForTemplate(fields),
      });
      onSaved();
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Save as Template</h2>
        <p className="text-sm text-gray-500 mb-4">
          Buyer names and contact info are stripped. Terms and contingency structure are kept.
        </p>

        <label className="label">Template Name *</label>
        <input
          className="input mb-3"
          placeholder="e.g. Standard Newton Offer – 20% Down, 45-Day Close"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <label className="label">Description (optional)</label>
        <textarea
          className="input resize-none mb-4"
          rows={2}
          placeholder="Notes about when to use this template"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
