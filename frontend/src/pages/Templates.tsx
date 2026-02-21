import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Template } from '../types';
import { listTemplates, deleteTemplate, createOffer } from '../api';

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTemplates().then(setTemplates).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleUse = async (template: Template) => {
    const offer = await createOffer({ fields: template.fields as never, status: 'draft' });
    navigate(`/offers/${offer.id}`);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Saved offer structures (buyer info stripped). Use to pre-fill a new offer.
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-sm mb-2">No templates saved yet.</p>
          <p className="text-gray-400 text-xs">
            After completing an offer, click "Save as Template" to reuse its structure.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="card p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">{t.name}</h2>
                {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="badge-gray">{t.formType}</span>
                  <span className="text-xs text-gray-400">
                    Saved {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                  {t.fields.financing?.type && (
                    <span className="badge-gray">{t.fields.financing.type}</span>
                  )}
                  {t.fields.terms?.purchasePrice && (
                    <span className="badge-gray">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
                        .format(t.fields.terms.purchasePrice)} list price
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleUse(t)} className="btn-primary text-xs">Use Template</button>
                <button onClick={() => handleDelete(t.id)} className="btn-secondary text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
