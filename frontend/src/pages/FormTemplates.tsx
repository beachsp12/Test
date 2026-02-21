import { useState, useEffect, useRef } from 'react';
import type { FormTemplate, InspectedField } from '../types';
import {
  listFormTemplates,
  uploadFormTemplate,
  inspectPdf,
  saveFieldMappings,
  deleteFormTemplate,
} from '../api';

interface PendingMapping {
  pdfFieldName: string;
  type: string;
  currentValue: string | boolean | null;
  options?: string[];
  schemaPath: string;
  transform: string;
  checkValue: string;
}

const SCHEMA_PATHS = [
  '', // none
  'property.streetAddress', 'property.unit', 'property.city', 'property.state', 'property.zip',
  'property.county', 'property.mlsNumber', 'property.propertyType',
  'buyer.names', 'buyer.entityType', 'buyer.address', 'buyer.phone', 'buyer.email',
  'seller.names',
  'terms.purchasePrice', 'terms.earnestMoneyDeposit', 'terms.earnestMoneyDueDays',
  'terms.closingDate', 'terms.closingDays',
  'terms.offerExpirationDate', 'terms.offerExpirationTime',
  'terms.closingCostContribution', 'terms.personalProperty',
  'financing.type', 'financing.downPaymentPercent', 'financing.loanAmount',
  'financing.lenderName', 'financing.preApprovalAmount',
  'contingencies.financingContingency', 'contingencies.financingDeadlineDays',
  'contingencies.inspectionContingency', 'contingencies.inspectionDeadlineDays',
  'contingencies.saleContingency', 'contingencies.salePropertyAddress',
  'additionalTerms',
];

const TRANSFORMS = ['', 'currency', 'date', 'percent', 'array_join', 'boolean_yn', 'boolean_check'];

export default function FormTemplates() {
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formType, setFormType] = useState('OTP');
  const [formTitle, setFormTitle] = useState('Greater Boston Offer to Purchase');
  const [formVersion, setFormVersion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [inspectedFields, setInspectedFields] = useState<InspectedField[] | null>(null);
  const [mappings, setMappings] = useState<PendingMapping[]>([]);
  const [activeFormType, setActiveFormType] = useState<string | null>(null);
  const [savingMappings, setSavingMappings] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listFormTemplates().then(setFormTemplates).finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!uploadFile || !formType || !formTitle) return;
    setUploading(true);
    setMessage(null);
    try {
      await uploadFormTemplate(uploadFile, formType, formTitle, formVersion || undefined);
      const fields = await inspectPdf(uploadFile);
      setInspectedFields(fields.fields);
      setMappings(fields.fields.map(f => ({
        pdfFieldName: f.name,
        type: f.type,
        currentValue: f.currentValue,
        options: f.options,
        schemaPath: f.suggestedMapping ?? '',
        transform: '',
        checkValue: '',
      })));
      setActiveFormType(formType);
      setMessage(`PDF uploaded. Found ${fields.fieldCount} form fields. Review mappings below, then save.`);
      const updated = await listFormTemplates();
      setFormTemplates(updated);
    } catch {
      setMessage('Upload failed. Ensure this is a valid fillable PDF form.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMappings = async () => {
    if (!activeFormType) return;
    setSavingMappings(true);
    try {
      const validMappings = mappings
        .filter(m => m.schemaPath)
        .map(m => ({
          pdfFieldName: m.pdfFieldName,
          schemaPath: m.schemaPath,
          transform: m.transform || undefined,
          checkValue: m.checkValue || undefined,
        }));
      await saveFieldMappings(activeFormType, validMappings);
      setMessage(`Saved ${validMappings.length} field mappings for ${activeFormType}. New PDFs will now use your GBBREB form.`);
      setInspectedFields(null);
    } catch {
      setMessage('Failed to save mappings.');
    } finally {
      setSavingMappings(false);
    }
  };

  const handleDelete = async (ft: string) => {
    if (!confirm(`Remove the ${ft} form template?`)) return;
    await deleteFormTemplate(ft);
    setFormTemplates(prev => prev.filter(t => t.formType !== ft));
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">GBBREB Form Templates</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload your official GBBREB blank PDF forms here. Once uploaded and mapped,
          the app will fill them directly instead of using the generated layout.
          Uploaded PDFs are saved and reused for every new offer of that type.
        </p>
      </div>

      {/* Existing templates */}
      {formTemplates.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Uploaded Forms</h2>
          <div className="space-y-2">
            {formTemplates.map(ft => (
              <div key={ft.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ft.formTitle}</p>
                  <p className="text-xs text-gray-500">
                    Type: {ft.formType}
                    {ft.formVersion ? ` · v${ft.formVersion}` : ''}
                    {' · '}Updated {new Date(ft.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => handleDelete(ft.formType)} className="text-xs text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload new form */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload a GBBREB PDF Form</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Form Type *</label>
            <select className="input" value={formType} onChange={e => setFormType(e.target.value)}>
              <option value="OTP">OTP – Offer to Purchase</option>
              <option value="PS">P&S – Purchase and Sale</option>
              <option value="BRA">BRA – Buyer Representation Agreement</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Form Title *</label>
            <input
              className="input"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. Greater Boston Offer to Purchase"
            />
          </div>
          <div>
            <label className="label">Form Version (optional)</label>
            <input
              className="input"
              value={formVersion}
              onChange={e => setFormVersion(e.target.value)}
              placeholder="e.g. 2024"
            />
          </div>
          <div>
            <label className="label">PDF File *</label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                         file:rounded-lg file:border-0 file:text-xs file:font-medium
                         file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading || !uploadFile}
          className="btn-primary text-sm"
        >
          {uploading ? 'Uploading & Inspecting…' : 'Upload & Inspect Fields'}
        </button>
        {message && (
          <p className="text-sm mt-2 text-brand-700">{message}</p>
        )}
      </div>

      {/* Field mapping table */}
      {inspectedFields && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Map PDF Fields → Offer Schema ({activeFormType})
            </h2>
            <button
              onClick={handleSaveMappings}
              disabled={savingMappings}
              className="btn-primary text-sm"
            >
              {savingMappings ? 'Saving…' : `Save ${mappings.filter(m => m.schemaPath).length} Mappings`}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Auto-suggested mappings are pre-filled. Adjust where needed. Leave Schema Path blank to skip a field.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-2 py-1.5 font-semibold text-gray-600">PDF Field Name</th>
                  <th className="px-2 py-1.5 font-semibold text-gray-600">Type</th>
                  <th className="px-2 py-1.5 font-semibold text-gray-600">Schema Path</th>
                  <th className="px-2 py-1.5 font-semibold text-gray-600">Transform</th>
                  <th className="px-2 py-1.5 font-semibold text-gray-600">Check Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((m, i) => (
                  <tr key={m.pdfFieldName} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5 font-mono text-gray-700 max-w-[160px] truncate" title={m.pdfFieldName}>
                      {m.pdfFieldName}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500">{m.type}</td>
                    <td className="px-2 py-1.5">
                      <select
                        className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs"
                        value={m.schemaPath}
                        onChange={e => setMappings(prev => prev.map((mm, ii) =>
                          ii === i ? { ...mm, schemaPath: e.target.value } : mm
                        ))}
                      >
                        {SCHEMA_PATHS.map(p => <option key={p} value={p}>{p || '— skip —'}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="border border-gray-200 rounded px-1 py-0.5 text-xs"
                        value={m.transform}
                        onChange={e => setMappings(prev => prev.map((mm, ii) =>
                          ii === i ? { ...mm, transform: e.target.value } : mm
                        ))}
                      >
                        {TRANSFORMS.map(t => <option key={t} value={t}>{t || 'none'}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      {m.type === 'checkbox' && (
                        <input
                          className="border border-gray-200 rounded px-1 py-0.5 text-xs w-20"
                          placeholder="e.g. true"
                          value={m.checkValue}
                          onChange={e => setMappings(prev => prev.map((mm, ii) =>
                            ii === i ? { ...mm, checkValue: e.target.value } : mm
                          ))}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
