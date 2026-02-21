// ─── Domain Types ─────────────────────────────────────────────────────────────

export type FinancingType = 'conventional' | 'FHA' | 'VA' | 'cash' | 'other';
export type EntityType = 'individual' | 'trust' | 'LLC' | 'corporation' | 'other';
export type OfferStatus = 'draft' | 'review' | 'final' | 'signed' | 'archived';
export type FormType = 'OTP' | 'PS' | 'BRA' | 'other';
export type PropertyType = 'single_family' | 'condo' | 'multi_family' | 'land' | 'other';

export interface PropertyInfo {
  streetAddress: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  mlsNumber?: string;
  propertyType?: PropertyType;
}

export interface BuyerInfo {
  names: string[];
  entityType: EntityType;
  address?: string;
  phone?: string;
  email?: string;
}

export interface SellerInfo {
  names: string[];
  entityType?: EntityType;
}

export interface FinancingInfo {
  type: FinancingType;
  lenderName?: string;
  preApprovalAmount?: number;
  downPaymentPercent?: number;
  loanAmount?: number;
}

export interface ContingencyInfo {
  financingContingency: boolean;
  financingDeadlineDays?: number;
  inspectionContingency: boolean;
  inspectionDeadlineDays?: number;
  saleContingency: boolean;
  salePropertyAddress?: string;
  saleDeadlineDays?: number;
  otherContingencies?: string[];
}

export interface OfferTerms {
  purchasePrice: number;
  earnestMoneyDeposit: number;
  earnestMoneyDueDays?: number;
  closingDate?: string;      // ISO date YYYY-MM-DD
  closingDays?: number;      // days from acceptance
  offerExpirationDate?: string;
  offerExpirationTime?: string;
  closingCostContribution?: number;
  personalProperty?: string[];
  inclusions?: string[];
  exclusions?: string[];
}

export interface OfferFields {
  property?: Partial<PropertyInfo>;
  buyer?: Partial<BuyerInfo>;
  seller?: Partial<SellerInfo>;
  financing?: Partial<FinancingInfo>;
  contingencies?: Partial<ContingencyInfo>;
  terms?: Partial<OfferTerms>;
  additionalTerms?: string;
  agentNotes?: string;
}

// ─── Extraction Types ─────────────────────────────────────────────────────────

export interface ExtractedField {
  value: unknown;
  confidence: number;  // 0–1
  notes?: string;
  source?: 'nlp' | 'manual' | 'template';
}

// Flat map of fieldPath → ExtractedField (e.g. "property.city" → {...})
export type ExtractionMetadata = Record<string, ExtractedField>;

export interface ExtractionResult {
  fields: OfferFields;
  metadata: ExtractionMetadata;
  missingRequired: string[];
  followUpQuestion?: string;
}

// ─── Persistence Types ────────────────────────────────────────────────────────

export interface Offer {
  id: string;
  name?: string;           // e.g. "42 Maple St – Johnson Offer"
  createdAt: string;
  updatedAt: string;
  status: OfferStatus;
  formType: FormType;
  fields: OfferFields;
  extractionMetadata?: ExtractionMetadata;
  notes?: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  formType: FormType;
  fields: Partial<OfferFields>;  // buyer-specific data stripped
  tags?: string[];
}

export interface DocumentRecord {
  id: string;
  offerId: string;
  version: number;
  createdAt: string;
  pdfPath: string;
  status: 'draft' | 'final' | 'signed';
  watermarked: boolean;
}

// ─── Chat / Conversation Types ────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExtractRequest {
  text: string;
  conversationHistory?: ChatMessage[];
  existingFields?: OfferFields;
}

export interface ExtractResponse {
  result: ExtractionResult;
  conversationHistory: ChatMessage[];
  assistantMessage: string;
}
