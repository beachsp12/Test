import { useState, useEffect } from 'react';
import type { MarketReportTemplate } from '../types';
import { listMarketReportTemplates, deleteMarketReportTemplate } from '../api';
import { useNavigate } from 'react-router-dom';

export default function MarketReportTemplates() {
  const [templates, setTemplates] = useState<MarketReportTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listMarketReportTemplates()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await deleteMarketReportTemplate(id);
    setTemplates(ts => ts.filter(t => t.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Market Report Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Reusable templates that store your market area and agent info. Load one each month and enter fresh stats.
          </p>
        </div>
        <button
          onClick={() => navigate('/market-reports')}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg"
        >
          New Report
        </button>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && templates.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm mt-1">Create a report and click “Save as Template” to build your library.</p>
          <button
            onClick={() => navigate('/market-reports')}
            className="mt-4 px-4 py-2 border border-amber-400 text-amber-600 rounded-lg hover:bg-amber-50 text-sm"
          >
            Go to Market Reports
          </button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
              {/* E&V brand bar */}
              <div className="h-1 w-full bg-gradient-to-r from-gray-900 via-amber-500 to-gray-900 rounded-full" />

              <div className="flex-1">
                <h2 className="font-bold text-gray-900">{tpl.name}</h2>
                {tpl.description && <p className="text-sm text-gray-500 mt-0.5">{tpl.description}</p>}

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {tpl.fields.marketArea   && <p><span className="text-gray-400 text-xs uppercase font-semibold">Area</span>  {tpl.fields.marketArea}</p>}
                  {tpl.fields.propertyType && <p><span className="text-gray-400 text-xs uppercase font-semibold">Type</span>  {tpl.fields.propertyType}</p>}
                  {tpl.fields.agentName    && <p><span className="text-gray-400 text-xs uppercase font-semibold">Agent</span> {tpl.fields.agentName}</p>}
                  {tpl.fields.officeName   && <p><span className="text-gray-400 text-xs uppercase font-semibold">Office</span> {tpl.fields.officeName}</p>}
                </div>

                <p className="text-xs text-gray-400 mt-3">Created {new Date(tpl.createdAt).toLocaleDateString()}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => navigate('/market-reports', { state: { loadTemplate: tpl } })}
                  className="flex-1 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg"
                >
                  Use Template
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="px-3 py-1.5 border border-red-200 text-red-500 text-sm rounded-lg hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
