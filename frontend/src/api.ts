import axios from 'axios';
import type {
  Offer,
  OfferFields,
  Template,
  ExtractResponse,
  ChatMessage,
  DocumentRecord,
  FormTemplate,
  InspectedField,
  MarketReport,
  MarketReportFields,
  MarketReportTemplate,
} from './types';

const api = axios.create({ baseURL: '/api' });

// ─── NLP Extraction ──────────────────────────────────────────────────────────────

export const extract = (
  text: string,
  conversationHistory: ChatMessage[] = [],
  existingFields?: OfferFields,
): Promise<ExtractResponse> =>
  api.post<ExtractResponse>('/extract', { text, conversationHistory, existingFields })
    .then(r => r.data);

// ─── Offers ───────────────────────────────────────────────────────────────────

export const listOffers = (): Promise<Offer[]> =>
  api.get<Offer[]>('/offers').then(r => r.data);

export const getOffer = (id: string): Promise<Offer> =>
  api.get<Offer>(`/offers/${id}`).then(r => r.data);

export const createOffer = (data: {
  fields?: OfferFields;
  notes?: string;
  status?: Offer['status'];
}): Promise<Offer> =>
  api.post<Offer>('/offers', data).then(r => r.data);

export const updateOffer = (
  id: string,
  data: {
    fields?: OfferFields;
    notes?: string;
    status?: Offer['status'];
    metadata?: unknown;
  },
): Promise<Offer> =>
  api.put<Offer>(`/offers/${id}`, data).then(r => r.data);

export const deleteOffer = (id: string): Promise<void> =>
  api.delete(`/offers/${id}`).then(() => undefined);

// ─── Templates ────────────────────────────────────────────────────────────

export const listTemplates = (): Promise<Template[]> =>
  api.get<Template[]>('/templates').then(r => r.data);

export const createTemplate = (data: {
  name: string;
  description?: string;
  formType?: Template['formType'];
  fields: Partial<OfferFields>;
  tags?: string[];
}): Promise<Template> =>
  api.post<Template>('/templates', data).then(r => r.data);

export const deleteTemplate = (id: string): Promise<void> =>
  api.delete(`/templates/${id}`).then(() => undefined);

// ─── Documents ──────────────────────────────────────────────────────────────

export const generateDocument = (
  offerId: string,
  final = false,
): Promise<{ documentId: string; version: number; status: string }> =>
  api.post(`/documents/generate/${offerId}?final=${final}`).then(r => r.data);

export const getDocumentPdfUrl = (docId: string): string =>
  `/api/documents/${docId}/pdf`;

export const listDocuments = (offerId: string): Promise<DocumentRecord[]> =>
  api.get<DocumentRecord[]>(`/documents/offer/${offerId}`).then(r => r.data);

// ─── GBBREB Form Templates (PDF upload & mapping) ────────────────────────

export const listFormTemplates = (): Promise<FormTemplate[]> =>
  api.get<FormTemplate[]>('/form-templates').then(r => r.data);

export const uploadFormTemplate = (
  file: File,
  formType: string,
  formTitle: string,
  formVersion?: string,
): Promise<{ id: string; formType: string; message: string }> => {
  const fd = new FormData();
  fd.append('pdf', file);
  fd.append('formType', formType);
  fd.append('formTitle', formTitle);
  if (formVersion) fd.append('formVersion', formVersion);
  return api.post('/form-templates/upload', fd).then(r => r.data);
};

export const inspectPdf = (file: File): Promise<{ fieldCount: number; fields: InspectedField[]; message: string }> => {
  const fd = new FormData();
  fd.append('pdf', file);
  return api.post('/documents/inspect-pdf', fd).then(r => r.data);
};

export const saveFieldMappings = (
  formType: string,
  mappings: Array<{
    pdfFieldName: string;
    schemaPath: string;
    transform?: string;
    checkValue?: string;
  }>,
): Promise<{ formType: string; mappingCount: number; message: string }> =>
  api.put(`/form-templates/${formType}/mappings`, { mappings }).then(r => r.data);

export const deleteFormTemplate = (formType: string): Promise<void> =>
  api.delete(`/form-templates/${formType}`).then(() => undefined);

// ─── Market Reports ──────────────────────────────────────────────────────────

export const extractMarketStats = (
  text: string,
): Promise<{ extracted: Partial<MarketReportFields> }> =>
  api.post('/market-reports/extract', { text }).then(r => r.data);

export const listMarketReports = (): Promise<MarketReport[]> =>
  api.get<MarketReport[]>('/market-reports').then(r => r.data);

export const createMarketReport = (data: {
  name?: string;
  fields: MarketReportFields;
}): Promise<MarketReport> =>
  api.post<MarketReport>('/market-reports', data).then(r => r.data);

export const updateMarketReport = (
  id: string,
  data: { name?: string; fields?: MarketReportFields },
): Promise<{ id: string; updatedAt: string }> =>
  api.put(`/market-reports/${id}`, data).then(r => r.data);

export const deleteMarketReport = (id: string): Promise<void> =>
  api.delete(`/market-reports/${id}`).then(() => undefined);

export const previewMarketReportPdf = (fields: MarketReportFields): Promise<Blob> =>
  api.post('/market-reports/preview', { fields }, { responseType: 'blob' }).then(r => r.data);

export const downloadMarketReportPdf = (id: string): Promise<Blob> =>
  api.post(`/market-reports/${id}/pdf`, {}, { responseType: 'blob' }).then(r => r.data);

// ─── Market Report Templates ───────────────────────────────────────────────

export const listMarketReportTemplates = (): Promise<MarketReportTemplate[]> =>
  api.get<MarketReportTemplate[]>('/market-reports/templates').then(r => r.data);

export const createMarketReportTemplate = (data: {
  name: string;
  description?: string;
  fields: Partial<MarketReportFields>;
  tags?: string[];
}): Promise<MarketReportTemplate> =>
  api.post<MarketReportTemplate>('/market-reports/templates', data).then(r => r.data);

export const deleteMarketReportTemplate = (id: string): Promise<void> =>
  api.delete(`/market-reports/templates/${id}`).then(() => undefined);

// ─── Health ───────────────────────────────────────────────────────────────────

export const healthCheck = (): Promise<{
  status: string;
  anthropicConfigured: boolean;
}> => api.get('/health').then(r => r.data);
