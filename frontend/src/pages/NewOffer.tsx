import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatInput from '../components/ChatInput';
import VoiceInput from '../components/VoiceInput';
import FieldReview from '../components/FieldReview';
import DocumentPreview from '../components/DocumentPreview';
import TemplateSelector from '../components/TemplateSelector';
import SaveTemplateModal from '../components/SaveTemplateModal';
import type { OfferFields, ExtractResponse, ExtractionMetadata, DocumentRecord } from '../types';
import { createOffer, updateOffer, listDocuments } from '../api';

type InputMethod = 'chat' | 'voice' | 'form';
type WorkflowStep = 'input' | 'review';

export default function NewOffer() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WorkflowStep>('input');
  const [inputMethod, setInputMethod] = useState<InputMethod>('chat');
  const [fields, setFields] = useState<OfferFields>({});
  const [metadata, setMetadata] = useState<ExtractionMetadata>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // When Claude returns an extraction result
  const handleExtraction = useCallback(async (response: ExtractResponse) => {
    const newFields = response.result.fields;
    setFields(prev => ({ ...prev, ...newFields }));
    setMetadata(prev => ({ ...prev, ...response.result.metadata }));
    setMissingRequired(response.result.missingRequired);

    if (response.result.missingRequired.length === 0) {
      setStep('review');
    }
  }, []);

  // Voice dictation sends transcript to chat
  const handleVoiceTranscript = (text: string) => {
    setVoiceTranscript(text);
    setInputMethod('chat'); // switch to chat so the transcript gets processed
  };

  // Apply a saved template
  const handleApplyTemplate = (templateFields: Partial<OfferFields>) => {
    setFields(prev => ({ ...templateFields, ...prev }));
  };

  // Save current state to DB
  const saveOffer = async (): Promise<string> => {
    setSaving(true);
    try {
      if (offerId) {
        await updateOffer(offerId, { fields, metadata });
        return offerId;
      } else {
        const offer = await createOffer({ fields, metadata });
        setOfferId(offer.id);
        return offer.id;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToReview = async () => {
    await saveOffer();
    setStep('review');
  };

  const handleDocumentGenerated = async (result: { documentId: string; version: number; status: string }) => {
    if (offerId) {
      const docs = await listDocuments(offerId);
      setDocuments(docs);
    }
  };

  const handleSave = async () => {
    const id = await saveOffer();
    navigate(`/offers/${id}`);
  };

  const allRequiredFilled = missingRequired.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Offer to Purchase</h1>
          <p className="text-sm text-gray-500 mt-0.5">Greater Boston Real Estate Board</p>
        </div>
        <div className="flex items-center gap-2">
          {step === 'review' && (
            <>
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="btn-secondary text-sm"
              >
                Save as Template
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-sm"
              >
                {saving ? 'Saving…' : 'Save Offer'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(['input', 'review'] as WorkflowStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
              ${step === s ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </div>
            <span className={`text-sm ${step === s ? 'font-semibold text-brand-700' : 'text-gray-400'}`}>
              {s === 'input' ? 'Enter Offer Details' : 'Review & Generate'}
            </span>
            {i < 1 && <span className="text-gray-300 text-sm">›</span>}
          </div>
        ))}
      </div>

      {step === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input */}
          <div className="space-y-4">
            {/* Template selector */}
            <TemplateSelector onApply={handleApplyTemplate} />

            {/* Input method tabs */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-gray-200">
                {(['chat', 'voice', 'form'] as InputMethod[]).map(method => (
                  <button
                    key={method}
                    onClick={() => setInputMethod(method)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      inputMethod === method
                        ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {method === 'chat' ? '💬 Chat' : method === 'voice' ? '🎤 Voice' : '📝 Form'}
                  </button>
                ))}
              </div>

              <div className="h-[480px]">
                {inputMethod === 'chat' && (
                  <ChatInput
                    onExtraction={handleExtraction}
                    existingFields={fields}
                  />
                )}
                {inputMethod === 'voice' && (
                  <div className="p-4 space-y-4">
                    <div className="p-4 bg-brand-50 rounded-xl">
                      <p className="text-sm text-brand-800 font-medium mb-1">Voice Dictation</p>
                      <p className="text-xs text-brand-700">
                        Click Start Dictation and describe the offer in detail. Your words will be
                        transcribed and field-extracted automatically.
                      </p>
                    </div>
                    <VoiceInput onTranscript={handleVoiceTranscript} />
                    {voiceTranscript && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Transcript captured:</p>
                        <p className="text-sm text-gray-700 italic">"{voiceTranscript}"</p>
                        <button
                          onClick={() => {
                            setInputMethod('chat');
                            setVoiceTranscript('');
                          }}
                          className="btn-primary text-xs mt-2"
                        >
                          Extract fields from transcript →
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {inputMethod === 'form' && (
                  <div className="p-4 text-sm text-gray-500 text-center pt-10">
                    <p className="text-gray-400 mb-3">Use chat or voice to populate fields first,</p>
                    <p className="text-gray-400">then switch to Review to edit individual fields.</p>
                    <button
                      onClick={() => setStep('review')}
                      className="btn-secondary mt-4 text-sm"
                    >
                      Go to Review →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live field preview */}
          <div className="card overflow-hidden" style={{ height: 580 }}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Live Field Preview</h2>
              <p className="text-xs text-gray-400">Fields populate as you describe the offer</p>
            </div>
            <div className="h-[520px] overflow-hidden">
              <FieldReview
                fields={fields}
                metadata={metadata}
                onChange={setFields}
                missingRequired={missingRequired}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'input' && Object.keys(fields).length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleProceedToReview}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Proceed to Review →'}
          </button>
        </div>
      )}

      {step === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Field review */}
          <div className="card overflow-hidden" style={{ height: 640 }}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Review & Edit Fields</h2>
                <p className="text-xs text-gray-400">Click any field to edit. Red = missing required.</p>
              </div>
              <button
                onClick={() => setStep('input')}
                className="text-xs text-brand-600 hover:underline"
              >
                ← Back to input
              </button>
            </div>
            <div className="overflow-auto" style={{ height: 588 }}>
              <FieldReview
                fields={fields}
                metadata={metadata}
                onChange={setFields}
                missingRequired={missingRequired}
              />
            </div>
          </div>

          {/* Right: Document preview */}
          <div className="card overflow-hidden" style={{ height: 640 }}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Document Preview</h2>
              <p className="text-xs text-gray-400">Generate a draft to preview the filled form</p>
            </div>
            <div style={{ height: 588 }}>
              {offerId ? (
                <DocumentPreview
                  offerId={offerId}
                  documents={documents}
                  onGenerate={handleDocumentGenerated}
                  canFinalize={allRequiredFilled}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p className="text-sm">Save the offer first to generate a PDF</p>
                  <button onClick={handleSave} disabled={saving} className="btn-primary mt-3 text-sm">
                    {saving ? 'Saving…' : 'Save & Enable PDF Generation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaveTemplate && (
        <SaveTemplateModal
          fields={fields}
          onSaved={() => setShowSaveTemplate(false)}
          onClose={() => setShowSaveTemplate(false)}
        />
      )}
    </div>
  );
}
