import { useState } from 'react';
import type { OfferFields, ExtractionMetadata } from '../types';
import { OTP_FIELD_GROUPS } from '../fieldGroups';

interface Props {
  fields: OfferFields;
  metadata?: ExtractionMetadata;
  onChange: (fields: OfferFields) => void;
  missingRequired?: string[];
}

function confidenceBadge(confidence: number | undefined) {
  if (confidence === undefined) return null;
  if (confidence >= 0.85) return <span className="badge-green ml-1">{Math.round(confidence * 100)}%</span>;
  if (confidence >= 0.6) return <span className="badge-yellow ml-1">{Math.round(confidence * 100)}%</span>;
  return <span className="badge-red ml-1">{Math.round(confidence * 100)}%</span>;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown> ?? {}) };
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

interface FieldRowProps {
  path: string;
  label: string;
  type: string;
  options?: string[];
  value: unknown;
  confidence?: number;
  isMissing: boolean;
  onChange: (path: string, value: unknown) => void;
}

function FieldRow({ path, label, type, options, value, confidence, isMissing, onChange }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const displayVal = Array.isArray(value) ? value.join(', ') : (value as string | number | undefined | null) ?? '';

  const rowClass = isMissing
    ? 'border-l-4 border-red-300 bg-red-50'
    : confidence !== undefined && confidence < 0.6
      ? 'border-l-4 border-yellow-300 bg-yellow-50'
      : 'border-l-4 border-transparent';

  const handleChange = (raw: string) => {
    if (type === 'number') {
      onChange(path, raw === '' ? null : Number(raw));
    } else if (type === 'boolean') {
      onChange(path, raw === 'true');
    } else if (type === 'array') {
      onChange(path, raw.split(',').map(s => s.trim()).filter(Boolean));
    } else {
      onChange(path, raw);
    }
  };

  return (
    <div className={`px-4 py-2.5 ${rowClass} hover:bg-gray-50 transition-colors`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="label !mb-0 !text-[10px]">{label}</span>
            {confidenceBadge(confidence)}
            {isMissing && <span className="badge-red !text-[9px] ml-1">Required</span>}
          </div>
          {editing ? (
            type === 'select' && options ? (
              <select
                autoFocus
                className="input !py-1 !text-sm"
                value={String(value ?? '')}
                onChange={e => { handleChange(e.target.value); setEditing(false); }}
                onBlur={() => setEditing(false)}
              >
                <option value="">— select —</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : type === 'boolean' ? (
              <select
                autoFocus
                className="input !py-1 !text-sm"
                value={value === true ? 'true' : value === false ? 'false' : ''}
                onChange={e => { handleChange(e.target.value); setEditing(false); }}
                onBlur={() => setEditing(false)}
              >
                <option value="">— select —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                autoFocus
                className="input !py-1 !text-sm"
                type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                value={String(displayVal)}
                onChange={e => handleChange(e.target.value)}
                onBlur={() => setEditing(false)}
                onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
                placeholder={type === 'array' ? 'Comma-separated values' : ''}
              />
            )
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-left w-full group flex items-center gap-1"
            >
              <span className={`${!displayVal ? 'text-gray-300 italic' : 'text-gray-900'}`}>
                {type === 'boolean'
                  ? value === true ? 'Yes' : value === false ? 'No' : '—'
                  : displayVal || '—'
                }
              </span>
              <svg className="w-3 h-3 text-gray-300 group-hover:text-brand-500 shrink-0 ml-auto" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FieldReview({ fields, metadata, onChange, missingRequired = [] }: Props) {
  const handleFieldChange = (path: string, value: unknown) => {
    const updated = setNestedValue(fields as Record<string, unknown>, path, value);
    onChange(updated as OfferFields);
  };

  const completionPct = Math.round(
    (1 - missingRequired.length / Math.max(missingRequired.length + 1, 9)) * 100
  );

  return (
    <div className="flex flex-col h-full">
      {/* Completion header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-600">Field Completion</span>
          <span className="text-xs text-gray-500">{missingRequired.length} required field(s) missing</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> High confidence</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Review needed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Missing required</span>
        <span className="ml-auto text-gray-400">Click any field to edit</span>
      </div>

      {/* Field groups */}
      <div className="flex-1 overflow-y-auto">
        {OTP_FIELD_GROUPS.map(group => (
          <div key={group.name} className="border-b border-gray-100 last:border-0">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                {group.name}
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {group.fields.map(fieldDef => {
                const rawVal = getNestedValue(fields as Record<string, unknown>, fieldDef.path);
                const meta = metadata?.[fieldDef.path];
                return (
                  <FieldRow
                    key={fieldDef.path}
                    path={fieldDef.path}
                    label={fieldDef.label}
                    type={fieldDef.type}
                    options={fieldDef.options}
                    value={rawVal}
                    confidence={meta?.confidence}
                    isMissing={missingRequired.includes(fieldDef.path)}
                    onChange={handleFieldChange}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
