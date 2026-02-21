import { useState, useEffect } from 'react';
import type { Template, OfferFields } from '../types';
import { listTemplates, deleteTemplate } from '../api';

interface Props {
  onApply: (fields: Partial<OfferFields>) => void;
}

export default function TemplateSelector({ onApply }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this template?')) return;
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  if (loading) return null;
  if (templates.length === 0) return null;

  return (
    <div className="border border-dashed border-gray-300 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-600
                   hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
          Start from a saved template ({templates.length})
        </span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {templates.map(t => (
            <div
              key={t.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-brand-50 cursor-pointer group"
              onClick={() => { onApply(t.fields); setExpanded(false); }}
            >
              <div>
                <p className="text-sm font-medium text-gray-800 group-hover:text-brand-700">{t.name}</p>
                {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                <p className="text-xs text-gray-400">{t.formType} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => handleDelete(t.id, e)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                  title="Delete template"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
