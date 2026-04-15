// Mirror the backend types for the frontend

export type FinancingType = 'conventional' | 'FHA' | 'VA' | 'cash' | 'other';
export type EntityType = 'individual' | 'trust' | 'LLC' | 'corporation' | 'other';
export type OfferStatus = 'draft' | 'review' | 'final' | 'signed' | 'archived';
export type FormType = 'OTP' | 'PS' | 'BRA' | 'other';

export interface OfferFields {
  property?: {
    streetAddress?: string;
    unit?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    mlsNumber?: string;
    propertyType?: string;
  };
  buyer?: {
    names?: string[];
    entityType?: EntityType;
    address?: string;
    phone?: string;
    email?: string;
  };
  seller?: {
    names?: string[];
    entityType?: EntityType;
  };
  financing?: {
    type?: FinancingType;
    lenderName?: string;
    preApprovalAmount?: number;
    downPaymentPercent?: number;
    loanAmount?: number;
  };
  contingencies?: {
    financingContingency?: boolean;
    financingDeadlineDays?: number;
    inspectionContingency?: boolean;
    inspectionDeadlineDays?: number;
    saleContingency?: boolean;
    salePropertyAddress?: string;
    saleDeadlineDays?: number;
    otherContingencies?: string[];
  };
  terms?: {
    purchasePrice?: number;
    earnestMoneyDeposit?: number;
    earnestMoneyDueDays?: number;
    closingDate?: string;
    closingDays?: number;
    offerExpirationDate?: string;
    offerExpirationTime?: string;
    closingCostContribution?: number;
    personalProperty?: string[];
    inclusions?: string[];
    exclusions?: string[];
  };
  additionalTerms?: string;
  agentNotes?: string;
}

export interface ExtractedField {
  value: unknown;
  confidence: number;
  notes?: string;
  source?: 'nlp' | 'manual' | 'template';
}

export type ExtractionMetadata = Record<string, ExtractedField>;

export interface ExtractionResult {
  fields: OfferFields;
  metadata: ExtractionMetadata;
  missingRequired: string[];
  followUpQuestion?: string;
}

export interface Offer {
  id: string;
  name?: string;
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
  fields: Partial<OfferFields>;
  tags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExtractResponse {
  result: ExtractionResult;
  conversationHistory: ChatMessage[];
  assistantMessage: string;
}

export interface DocumentRecord {
  id: string;
  offerId: string;
  version: number;
  createdAt: string;
  status: 'draft' | 'final' | 'signed';
  watermarked: boolean;
}

export interface FormTemplate {
  id: string;
  formType: string;
  formTitle: string;
  formVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectedField {
  name: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'unknown';
  currentValue: string | boolean | null;
  options?: string[];
  suggestedMapping?: string;
}

// ─── Market Report Types ───────────────────────────────────────────────────

export interface MarketStats {
  activeListings?: number;
  newListings?: number;
  closedSales?: number;
  avgDaysOnMarket?: number;
  medianSalePrice?: number;
  avgSalePrice?: number;
  listToSaleRatio?: number;   // decimal e.g. 0.98
  monthsOfSupply?: number;
  medianSalePriceYoY?: number; // percent change e.g. 5.2
  avgSalePriceYoY?: number;
}

export interface PriceRangeRow {
  range: string;
  count: number;
  pctOfTotal?: number;
}

export interface MarketReportFields {
  marketArea: string;
  reportPeriod: string;
  propertyType?: string;
  stats: MarketStats;
  priceRanges?: PriceRangeRow[];
  narrative?: string;
  agentName?: string;
  agentTitle?: string;
  agentPhone?: string;
  agentEmail?: string;
  agentLicense?: string;
  officeName?: string;
  officeAddress?: string;
}

export interface MarketReport {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fields: MarketReportFields;
}

export interface MarketReportTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  fields: Partial<MarketReportFields>;
  tags?: string[];
}
