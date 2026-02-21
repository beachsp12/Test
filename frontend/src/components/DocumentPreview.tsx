import { useState } from 'react';
import type { DocumentRecord } from '../types';
import { getDocumentPdfUrl, generateDocument } from '../api';

interface Props {
  offerId: string;
  documents: DocumentRecord[];
  onGenerate: (doc: { documentId: string; version: number; status: string }) => void;
  canFinalize?: boolean;
  loading?: boolean;
}

export default function DocumentPreview({ offerId, documents, onGenerate, canFinalize, loading }: Props) {
  const [generating, setGenerating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(
    documents.length > 0 ? documents[0] : null
  );
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (final: boolean) => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateDocument(offerId, final);
      onGenerate(result);
    } catch {
      setError('PDF generation failed. Check backend logs.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50 flex-wrap">
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating || loading}
          className="btn-secondary text-xs"
        >
          {generating ? 'Generating…' : 'Generate Draft PDF'}
        </button>
        {canFinalize && (
          <button
            onClick={() => handleGenerate(true)}
            disabled={generating || loading}
            className="btn-primary text-xs"
          >
            Generate Final PDF
          </button>
        )}
        {selectedDoc && (
          <a
            href={getDocumentPdfUrl(selectedDoc.id)}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-xs ml-auto"
            download={`offer-v${selectedDoc.version}.pdf`}
          >
            ↓ Download
          </a>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-xs bg-red-50 border-b border-red-200 px-4 py-2">
          {error}
        </div>
      )}

      {/* Version selector */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-500 overflow-x-auto">
          <span className="shrink-0 font-semibold">Versions:</span>
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`shrink-0 px-2 py-0.5 rounded-full border transition-colors ${
                selectedDoc?.id === doc.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-300 hover:border-brand-400'
              }`}
            >
              v{doc.version} {doc.status === 'final' ? '✓' : doc.watermarked ? '[DRAFT]' : ''}
            </button>
          ))}
        </div>
      )}

      {/* PDF preview */}
      <div className="flex-1 bg-gray-200 relative overflow-hidden">
        {selectedDoc ? (
          <iframe
            key={selectedDoc.id}
            src={getDocumentPdfUrl(selectedDoc.id)}
            className="w-full h-full border-0"
            title={`Offer document v${selectedDoc.version}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-16 h-16 mb-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No document generated yet</p>
            <p className="text-xs mt-1 text-gray-400">Click "Generate Draft PDF" to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
