import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FieldReview from '../components/FieldReview';
import DocumentPreview from '../components/DocumentPreview';
import SaveTemplateModal from '../components/SaveTemplateModal';
import type { Offer, DocumentRecord } from '../types';
import { getOffer, updateOffer, deleteOffer, listDocuments } from '../api';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  review: 'In Review',
  final: 'Final',
  signed: 'Signed',
  archived: 'Archived',
};

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getOffer(id), listDocuments(id)])
      .then(([o, docs]) => { setOffer(o); setDocuments(docs); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFieldChange = (newFields: typeof offer extends null ? never : Offer['fields']) => {
    if (!offer) return;
    setOffer(prev => prev ? { ...prev, fields: newFields } : prev);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!offer) return;
    setSaving(true);
    try {
      const updated = await updateOffer(offer.id, { fields: offer.fields });
      setOffer(updated);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!offer || !confirm('Delete this offer permanently?')) return;
    await deleteOffer(offer.id);
    navigate('/offers');
  };

  const handleDocumentGenerated = async () => {
    if (!id) return;
    const docs = await listDocuments(id);
    setDocuments(docs);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!offer) return <div className="p-8 text-center text-red-500">Offer not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/offers')} className="text-xs text-brand-600 hover:underline mb-1 block">
            ← Back to offers
          </button>
          <h1 className="text-xl font-bold text-gray-900">{offer.name ?? 'Untitled Offer'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge-gray">{offer.formType}</span>
            <span className="badge-gray">{STATUS_LABELS[offer.status]}</span>
            <span className="text-xs text-gray-400">
              Updated {new Date(offer.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setShowSaveTemplate(true)} className="btn-secondary text-sm">
            Save as Template
          </button>
          {isDirty && (
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
          <button onClick={handleDelete} className="btn-danger text-sm">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden" style={{ height: 640 }}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Fields</h2>
            <p className="text-xs text-gray-400">Click any field to edit</p>
          </div>
          <div className="overflow-auto" style={{ height: 588 }}>
            <FieldReview
              fields={offer.fields}
              metadata={offer.extractionMetadata}
              onChange={handleFieldChange}
              missingRequired={[]}
            />
          </div>
        </div>

        <div className="card overflow-hidden" style={{ height: 640 }}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Document</h2>
          </div>
          <div style={{ height: 588 }}>
            <DocumentPreview
              offerId={offer.id}
              documents={documents}
              onGenerate={handleDocumentGenerated}
              canFinalize={offer.status !== 'final' && offer.status !== 'signed'}
            />
          </div>
        </div>
      </div>

      {showSaveTemplate && (
        <SaveTemplateModal
          fields={offer.fields}
          onSaved={() => setShowSaveTemplate(false)}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
    </div>
  );
}
