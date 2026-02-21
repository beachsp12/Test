/**
 * GBBREB Offer to Purchase (OTP) field schema.
 *
 * Defines which fields are required, their display labels, grouping,
 * and the dot-path used in ExtractionMetadata.
 */

export interface FieldDefinition {
  path: string;          // dot-notation path into OfferFields
  label: string;         // human-readable label
  group: FieldGroup;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'select';
  options?: string[];    // for select type
  placeholder?: string;
}

export type FieldGroup =
  | 'Property'
  | 'Buyer'
  | 'Seller'
  | 'Offer Terms'
  | 'Financing'
  | 'Contingencies'
  | 'Additional';

export const OTP_FIELDS: FieldDefinition[] = [
  // ── Property ──────────────────────────────────────────────────────────────
  {
    path: 'property.streetAddress',
    label: 'Street Address',
    group: 'Property',
    required: true,
    type: 'string',
    placeholder: '42 Maple Street',
  },
  {
    path: 'property.unit',
    label: 'Unit / Apt #',
    group: 'Property',
    required: false,
    type: 'string',
    placeholder: 'Unit 2B',
  },
  {
    path: 'property.city',
    label: 'City / Town',
    group: 'Property',
    required: true,
    type: 'string',
    placeholder: 'Newton',
  },
  {
    path: 'property.state',
    label: 'State',
    group: 'Property',
    required: true,
    type: 'string',
    placeholder: 'MA',
  },
  {
    path: 'property.zip',
    label: 'ZIP Code',
    group: 'Property',
    required: true,
    type: 'string',
    placeholder: '02459',
  },
  {
    path: 'property.county',
    label: 'County',
    group: 'Property',
    required: false,
    type: 'string',
    placeholder: 'Middlesex',
  },
  {
    path: 'property.mlsNumber',
    label: 'MLS #',
    group: 'Property',
    required: false,
    type: 'string',
    placeholder: '73123456',
  },
  {
    path: 'property.propertyType',
    label: 'Property Type',
    group: 'Property',
    required: false,
    type: 'select',
    options: ['single_family', 'condo', 'multi_family', 'land', 'other'],
  },

  // ── Buyer ─────────────────────────────────────────────────────────────────
  {
    path: 'buyer.names',
    label: 'Buyer Name(s)',
    group: 'Buyer',
    required: true,
    type: 'array',
    placeholder: 'John Smith, Jane Smith',
  },
  {
    path: 'buyer.entityType',
    label: 'Buyer Entity Type',
    group: 'Buyer',
    required: true,
    type: 'select',
    options: ['individual', 'trust', 'LLC', 'corporation', 'other'],
  },
  {
    path: 'buyer.address',
    label: 'Buyer Current Address',
    group: 'Buyer',
    required: false,
    type: 'string',
    placeholder: '100 Oak Ave, Brookline MA 02446',
  },
  {
    path: 'buyer.phone',
    label: 'Buyer Phone',
    group: 'Buyer',
    required: false,
    type: 'string',
  },
  {
    path: 'buyer.email',
    label: 'Buyer Email',
    group: 'Buyer',
    required: false,
    type: 'string',
  },

  // ── Seller ────────────────────────────────────────────────────────────────
  {
    path: 'seller.names',
    label: 'Seller Name(s)',
    group: 'Seller',
    required: false,
    type: 'array',
    placeholder: 'Robert Johnson',
  },

  // ── Offer Terms ───────────────────────────────────────────────────────────
  {
    path: 'terms.purchasePrice',
    label: 'Purchase Price ($)',
    group: 'Offer Terms',
    required: true,
    type: 'number',
    placeholder: '850000',
  },
  {
    path: 'terms.earnestMoneyDeposit',
    label: 'Earnest Money Deposit ($)',
    group: 'Offer Terms',
    required: true,
    type: 'number',
    placeholder: '10000',
  },
  {
    path: 'terms.earnestMoneyDueDays',
    label: 'Earnest Money Due (days after acceptance)',
    group: 'Offer Terms',
    required: false,
    type: 'number',
    placeholder: '3',
  },
  {
    path: 'terms.closingDate',
    label: 'Closing Date',
    group: 'Offer Terms',
    required: false,
    type: 'date',
    placeholder: 'YYYY-MM-DD',
  },
  {
    path: 'terms.closingDays',
    label: 'Days to Closing (from acceptance)',
    group: 'Offer Terms',
    required: false,
    type: 'number',
    placeholder: '45',
  },
  {
    path: 'terms.offerExpirationDate',
    label: 'Offer Expiration Date',
    group: 'Offer Terms',
    required: false,
    type: 'date',
  },
  {
    path: 'terms.offerExpirationTime',
    label: 'Offer Expiration Time',
    group: 'Offer Terms',
    required: false,
    type: 'string',
    placeholder: '17:00',
  },
  {
    path: 'terms.closingCostContribution',
    label: 'Seller Closing Cost Contribution ($)',
    group: 'Offer Terms',
    required: false,
    type: 'number',
    placeholder: '0',
  },
  {
    path: 'terms.personalProperty',
    label: 'Personal Property Included',
    group: 'Offer Terms',
    required: false,
    type: 'array',
    placeholder: 'Refrigerator, washer/dryer',
  },

  // ── Financing ─────────────────────────────────────────────────────────────
  {
    path: 'financing.type',
    label: 'Financing Type',
    group: 'Financing',
    required: true,
    type: 'select',
    options: ['conventional', 'FHA', 'VA', 'cash', 'other'],
  },
  {
    path: 'financing.downPaymentPercent',
    label: 'Down Payment (%)',
    group: 'Financing',
    required: false,
    type: 'number',
    placeholder: '20',
  },
  {
    path: 'financing.loanAmount',
    label: 'Loan Amount ($)',
    group: 'Financing',
    required: false,
    type: 'number',
  },
  {
    path: 'financing.lenderName',
    label: 'Lender Name',
    group: 'Financing',
    required: false,
    type: 'string',
    placeholder: 'Citizens Bank',
  },
  {
    path: 'financing.preApprovalAmount',
    label: 'Pre-Approval Amount ($)',
    group: 'Financing',
    required: false,
    type: 'number',
  },

  // ── Contingencies ─────────────────────────────────────────────────────────
  {
    path: 'contingencies.financingContingency',
    label: 'Financing Contingency',
    group: 'Contingencies',
    required: true,
    type: 'boolean',
  },
  {
    path: 'contingencies.financingDeadlineDays',
    label: 'Financing Contingency Deadline (days)',
    group: 'Contingencies',
    required: false,
    type: 'number',
    placeholder: '21',
  },
  {
    path: 'contingencies.inspectionContingency',
    label: 'Inspection Contingency',
    group: 'Contingencies',
    required: true,
    type: 'boolean',
  },
  {
    path: 'contingencies.inspectionDeadlineDays',
    label: 'Inspection Deadline (days)',
    group: 'Contingencies',
    required: false,
    type: 'number',
    placeholder: '10',
  },
  {
    path: 'contingencies.saleContingency',
    label: 'Sale of Buyer\'s Property Contingency',
    group: 'Contingencies',
    required: false,
    type: 'boolean',
  },
  {
    path: 'contingencies.salePropertyAddress',
    label: 'Property to be Sold Address',
    group: 'Contingencies',
    required: false,
    type: 'string',
  },

  // ── Additional ────────────────────────────────────────────────────────────
  {
    path: 'additionalTerms',
    label: 'Additional Terms',
    group: 'Additional',
    required: false,
    type: 'string',
    placeholder: 'Seller to provide clean title, ...',
  },
  {
    path: 'agentNotes',
    label: 'Agent Notes (internal, not on document)',
    group: 'Additional',
    required: false,
    type: 'string',
  },
];

export const REQUIRED_FIELD_PATHS = OTP_FIELDS
  .filter(f => f.required)
  .map(f => f.path);

/** Checks which required fields are missing from the current fields object. */
export function getMissingRequiredFields(fields: Record<string, unknown>): string[] {
  const missing: string[] = [];
  for (const path of REQUIRED_FIELD_PATHS) {
    const val = getNestedValue(fields, path);
    if (val === null || val === undefined || val === '') {
      missing.push(path);
    }
    if (Array.isArray(val) && val.length === 0) {
      missing.push(path);
    }
  }
  return missing;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
