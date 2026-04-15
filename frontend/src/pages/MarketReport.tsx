import { useState, useEffect } from 'react';
import type { MarketReportFields, MarketReportTemplate, MarketReport as MRType, PriceRangeRow } from '../types';
import {
  extractMarketStats,
  previewMarketReportPdf,
  downloadMarketReportPdf,
  createMarketReport,
  listMarketReports,
  deleteMarketReport,
  listMarketReportTemplates,
  createMarketReportTemplate,
} from '../api';

const PROPERTY_TYPES = ['All Residential', 'Single Family', 'Condo / Townhome', 'Multi-Family', 'Land', 'Commercial', 'Luxury'];

const EMPTY_FIELDS: MarketReportFields = {
  marketArea: '',
  reportPeriod: '',
  propertyType: 'All Residential',
  stats: {},
  priceRanges: [],
  narrative: '',
  agentName: '',
  agentTitle: '',
  agentPhone: '',
  agentEmail: '',
  agentLicense: '',
  officeName: 'Engel & Völkers',
  officeAddress: '',
};

function numField(
  label: string,
  val: number | undefined,
  onChange: (v: number | undefined) => void,
  hint?: string,
) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}{hint && <span className="font-normal normal-case text-gray-400 ml-1">({hint})</span>}
      </label>
      <input
        type="number"
        value={val ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

function textField(
  label: string,
  val: string,
  onChange: (v: string) => void,
  placeholder = '',
) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text"
        value={val}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

export default function MarketReport() {
  const [tab, setTab]           = useState<'form' | 'history'>('form');
  const [fields, setFields]     = useState<MarketReportFields>(EMPTY_FIELDS);
  const [pasteText, setPasteText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [reports, setReports]   = useState<MRType[]>([]);
  const [templates, setTemplates] = useState<MarketReportTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName]   = useState('');
  const [templateDesc, setTemplateDesc]   = useState('');
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    listMarketReports().then(setReports).catch(console.error);
    listMarketReportTemplates().then(setTemplates).catch(console.error);
  }, []);

  function setStats(patch: Partial<MarketReportFields['stats']>) {
    setFields(f => ({ ...f, stats: { ...f.stats, ...patch } }));
  }

  function setTop(patch: Partial<MarketReportFields>) {
    setFields(f => ({ ...f, ...patch }));
  }

  // ── AI extract from pasted text ────────────────────────────────

  async function handleExtract() {
    if (!pasteText.trim()) return;
    setExtracting(true);
    setError('');
    try {
      const { extracted } = await extractMarketStats(pasteText);
      setFields(f => ({
        ...f,
        marketArea:   extracted.marketArea   || f.marketArea,
        reportPeriod: extracted.reportPeriod || f.reportPeriod,
        propertyType: extracted.propertyType || f.propertyType,
        stats: { ...f.stats, ...(extracted.stats ?? {}) },
        priceRanges: extracted.priceRanges?.length ? extracted.priceRanges : f.priceRanges,
      }));
      setPasteText('');
      setSuccess('Stats extracted — review below and adjust as needed.');
    } catch {
      setError('Extraction failed. Check your API key and try again.');
    } finally {
      setExtracting(false);
    }
  }

  // ── Preview PDF ─────────────────────────────────────────────

  async function handlePreview() {
    if (!fields.marketArea || !fields.reportPeriod) {
      setError('Market area and report period are required.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const blob = await previewMarketReportPdf(fields);
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setError('PDF generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Save to library ────────────────────────────────────────

  async function handleSave() {
    if (!fields.marketArea || !fields.reportPeriod) {
      setError('Market area and report period are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await createMarketReport({ fields });
      setReports(r => [saved, ...r]);
      setSuccess('Report saved to library.');
    } catch {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  // ── Save as template ─────────────────────────────────────

  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    // Strip the live stats — template stores area + agent info only
    const templateFields: Partial<MarketReportFields> = {
      marketArea:   fields.marketArea,
      propertyType: fields.propertyType,
      agentName:    fields.agentName,
      agentTitle:   fields.agentTitle,
      agentPhone:   fields.agentPhone,
      agentEmail:   fields.agentEmail,
      agentLicense: fields.agentLicense,
      officeName:   fields.officeName,
      officeAddress: fields.officeAddress,
    };
    try {
      const tpl = await createMarketReportTemplate({
        name: templateName,
        description: templateDesc || undefined,
        fields: templateFields,
      });
      setTemplates(t => [tpl, ...t]);
      setShowTemplateModal(false);
      setTemplateName('');
      setTemplateDesc('');
      setSuccess('Template saved. Load it next month to pre-fill your agent & area info.');
    } catch {
      setError('Template save failed.');
    }
  }

  // ── Load template ─────────────────────────────────────────

  function loadTemplate(tpl: MarketReportTemplate) {
    setFields(f => ({
      ...f,
      marketArea:   tpl.fields.marketArea   ?? f.marketArea,
      propertyType: tpl.fields.propertyType ?? f.propertyType,
      agentName:    tpl.fields.agentName    ?? f.agentName,
      agentTitle:   tpl.fields.agentTitle   ?? f.agentTitle,
      agentPhone:   tpl.fields.agentPhone   ?? f.agentPhone,
      agentEmail:   tpl.fields.agentEmail   ?? f.agentEmail,
      agentLicense: tpl.fields.agentLicense ?? f.agentLicense,
      officeName:   tpl.fields.officeName   ?? f.officeName,
      officeAddress: tpl.fields.officeAddress ?? f.officeAddress,
    }));
    setShowLoadModal(false);
    setSuccess(`Template “${tpl.name}” loaded. Enter this month’s stats and generate.`);
  }

  // ── Download saved report PDF ───────────────────────────

  async function handleDownload(report: MRType) {
    try {
      const blob = await downloadMarketReportPdf(report.id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ev-market-report-${report.fields.marketArea.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
    } catch {
      setError('Download failed.');
    }
  }

  // ── Price ranges ───────────────────────────────────────────

  function updatePriceRow(idx: number, patch: Partial<PriceRangeRow>) {
    setFields(f => {
      const rows = [...(f.priceRanges ?? [])];
      rows[idx]  = { ...rows[idx], ...patch };
      return { ...f, priceRanges: rows };
    });
  }

  function addPriceRow() {
    setFields(f => ({ ...f, priceRanges: [...(f.priceRanges ?? []), { range: '', count: 0 }] }));
  }

  function removePriceRow(idx: number) {
    setFields(f => ({ ...f, priceRanges: (f.priceRanges ?? []).filter((_, i) => i !== idx) }));
  }

  // ── Render ───────────────────────────────────────────────────

  const s = fields.stats;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate an Engel &amp; Völkers branded market report PDF</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLoadModal(true)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Load Template
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-3 py-1.5 text-sm border border-amber-400 rounded-lg hover:bg-amber-50 text-amber-700"
          >
            Save as Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['form', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'form' ? 'New Report' : `Report History (${reports.length})`}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}<button onClick={() => setError('')} className="float-right font-bold">×</button></div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{success}<button onClick={() => setSuccess('')} className="float-right font-bold">×</button></div>}

      {/* ════ FORM TAB ════ */}
      {tab === 'form' && (
        <div className="space-y-6">

          {/* AI extract panel */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-amber-800 mb-2">Paste Another Brokerage’s Report Text</h2>
            <p className="text-xs text-amber-700 mb-3">Claude will extract the market stats automatically. Paste the text content of any market report.</p>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste market report text here…"
              rows={5}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={handleExtract}
              disabled={extracting || !pasteText.trim()}
              className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              {extracting ? 'Extracting…' : 'Extract Stats with AI'}
            </button>
          </div>

          {/* Report info */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Report Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {textField('Market Area', fields.marketArea, v => setTop({ marketArea: v }), 'e.g. Downtown Boston')}
              {textField('Report Period', fields.reportPeriod, v => setTop({ reportPeriod: v }), 'e.g. March 2025')}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Property Type</label>
                <select
                  value={fields.propertyType ?? 'All Residential'}
                  onChange={e => setTop({ propertyType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {PROPERTY_TYPES.map(pt => <option key={pt}>{pt}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Market stats */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Market Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {numField('Median Sale Price', s.medianSalePrice, v => setStats({ medianSalePrice: v }), '$')}
              {numField('Avg Sale Price',    s.avgSalePrice,    v => setStats({ avgSalePrice: v }),    '$')}
              {numField('Closed Sales',      s.closedSales,     v => setStats({ closedSales: v }))}
              {numField('Active Listings',   s.activeListings,  v => setStats({ activeListings: v }))}
              {numField('New Listings',      s.newListings,     v => setStats({ newListings: v }))}
              {numField('Avg Days on Market',s.avgDaysOnMarket, v => setStats({ avgDaysOnMarket: v }))}
              {numField('Months of Supply',  s.monthsOfSupply,  v => setStats({ monthsOfSupply: v }), '1 decimal')}
              {numField('List-to-Sale Ratio',s.listToSaleRatio, v => setStats({ listToSaleRatio: v }), 'decimal e.g. 0.98')}
            </div>
          </section>

          {/* YoY */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Year-over-Year Change <span className="font-normal normal-case text-gray-400">(optional)</span></h2>
            <p className="text-xs text-gray-400 mb-3">Enter as percent, e.g. 5.2 for +5.2% or −3.1 for −3.1%</p>
            <div className="grid grid-cols-2 gap-4">
              {numField('Median Sale Price YoY %', s.medianSalePriceYoY, v => setStats({ medianSalePriceYoY: v }))}
              {numField('Avg Sale Price YoY %',    s.avgSalePriceYoY,    v => setStats({ avgSalePriceYoY: v }))}
            </div>
          </section>

          {/* Price ranges */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Activity by Price Range <span className="font-normal normal-case text-gray-400">(optional)</span></h2>
              <button onClick={addPriceRow} className="text-xs text-amber-600 hover:text-amber-700 font-semibold">+ Add Row</button>
            </div>
            {(fields.priceRanges ?? []).length > 0 && (
              <div className="space-y-2">
                {(fields.priceRanges ?? []).map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text" value={row.range}
                      onChange={e => updatePriceRow(idx, { range: e.target.value })}
                      placeholder="e.g. Under $500K"
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number" value={row.count || ''}
                      onChange={e => updatePriceRow(idx, { count: Number(e.target.value) })}
                      placeholder="Count"
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number" value={row.pctOfTotal ?? ''}
                      onChange={e => updatePriceRow(idx, { pctOfTotal: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="% total"
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={() => removePriceRow(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Narrative */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Market Commentary <span className="font-normal normal-case text-gray-400">(optional)</span></h2>
            <textarea
              value={fields.narrative ?? ''}
              onChange={e => setTop({ narrative: e.target.value })}
              placeholder="Brief market narrative that will appear on the report…"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </section>

          {/* Agent info */}
          <section>
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Agent &amp; Office Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {textField('Agent Name',    fields.agentName    ?? '', v => setTop({ agentName: v }))}
              {textField('Title',         fields.agentTitle   ?? '', v => setTop({ agentTitle: v }),   'e.g. Licensed Real Estate Salesperson')}
              {textField('Phone',         fields.agentPhone   ?? '', v => setTop({ agentPhone: v }))}
              {textField('Email',         fields.agentEmail   ?? '', v => setTop({ agentEmail: v }))}
              {textField('License #',     fields.agentLicense ?? '', v => setTop({ agentLicense: v }))}
              {textField('Office Name',   fields.officeName   ?? '', v => setTop({ officeName: v }))}
              {textField('Office Address',fields.officeAddress ?? '',v => setTop({ officeAddress: v }))}
            </div>
          </section>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handlePreview}
              disabled={generating}
              className="px-5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              {generating ? 'Generating…' : 'Preview PDF'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              {saving ? 'Saving…' : 'Save to Library'}
            </button>
            <button
              onClick={() => setFields(EMPTY_FIELDS)}
              className="px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-600 text-sm rounded-lg"
            >
              Clear Form
            </button>
          </div>
        </div>
      )}

      {/* ════ HISTORY TAB ════ */}
      {tab === 'history' && (
        <div>
          {reports.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No saved reports yet. Generate and save one from the New Report tab.</p>
          ) : (
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-800">{r.fields.marketArea}</p>
                    <p className="text-sm text-gray-500">{r.fields.reportPeriod}{r.fields.propertyType ? ` · ${r.fields.propertyType}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(r)}
                      className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => { setFields(r.fields); setTab('form'); }}
                      className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        await deleteMarketReport(r.id);
                        setReports(rs => rs.filter(x => x.id !== r.id));
                      }}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ SAVE TEMPLATE MODAL ════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Save as Template</h2>
            <p className="text-sm text-gray-500 mb-4">Saves market area + agent/office info. Stats are excluded so you can enter fresh numbers each month.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Template Name</label>
                <input
                  type="text" value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Downtown Boston – All Residential"
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description (optional)</label>
                <input
                  type="text" value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSaveTemplate} disabled={!templateName.trim()} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm rounded-lg">Save Template</button>
              <button onClick={() => setShowTemplateModal(false)} className="flex-1 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ LOAD TEMPLATE MODAL ════ */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Load Template</h2>
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400">No templates saved yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => loadTemplate(tpl)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    <p className="font-semibold text-gray-800 text-sm">{tpl.name}</p>
                    {tpl.description && <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{tpl.fields.marketArea} · {tpl.fields.propertyType}</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowLoadModal(false)} className="mt-4 w-full py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
