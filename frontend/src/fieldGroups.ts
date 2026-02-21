/** Field group definitions for the review UI. Mirrors backend schemas/offerFields.ts */

export interface UIFieldDef {
  path: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'select';
  options?: string[];
  required?: boolean;
}

export interface FieldGroup {
  name: string;
  fields: UIFieldDef[];
}

export const OTP_FIELD_GROUPS: FieldGroup[] = [
  {
    name: 'Property',
    fields: [
      { path: 'property.streetAddress', label: 'Street Address', type: 'string', required: true },
      { path: 'property.unit', label: 'Unit / Apt #', type: 'string' },
      { path: 'property.city', label: 'City / Town', type: 'string', required: true },
      { path: 'property.state', label: 'State', type: 'string', required: true },
      { path: 'property.zip', label: 'ZIP Code', type: 'string', required: true },
      { path: 'property.county', label: 'County', type: 'string' },
      { path: 'property.mlsNumber', label: 'MLS #', type: 'string' },
      {
        path: 'property.propertyType', label: 'Property Type', type: 'select',
        options: ['single_family', 'condo', 'multi_family', 'land', 'other'],
      },
    ],
  },
  {
    name: 'Buyer',
    fields: [
      { path: 'buyer.names', label: 'Buyer Name(s)', type: 'array', required: true },
      {
        path: 'buyer.entityType', label: 'Entity Type', type: 'select',
        options: ['individual', 'trust', 'LLC', 'corporation', 'other'],
        required: true,
      },
      { path: 'buyer.address', label: 'Buyer Current Address', type: 'string' },
      { path: 'buyer.phone', label: 'Buyer Phone', type: 'string' },
      { path: 'buyer.email', label: 'Buyer Email', type: 'string' },
    ],
  },
  {
    name: 'Seller',
    fields: [
      { path: 'seller.names', label: 'Seller Name(s)', type: 'array' },
    ],
  },
  {
    name: 'Offer Terms',
    fields: [
      { path: 'terms.purchasePrice', label: 'Purchase Price ($)', type: 'number', required: true },
      { path: 'terms.earnestMoneyDeposit', label: 'Earnest Money Deposit ($)', type: 'number', required: true },
      { path: 'terms.earnestMoneyDueDays', label: 'EMD Due (days after acceptance)', type: 'number' },
      { path: 'terms.closingDate', label: 'Closing Date', type: 'date' },
      { path: 'terms.closingDays', label: 'Days to Closing (from acceptance)', type: 'number' },
      { path: 'terms.offerExpirationDate', label: 'Offer Expiration Date', type: 'date' },
      { path: 'terms.offerExpirationTime', label: 'Offer Expiration Time (HH:MM)', type: 'string' },
      { path: 'terms.closingCostContribution', label: 'Seller Closing Cost Contribution ($)', type: 'number' },
      { path: 'terms.personalProperty', label: 'Personal Property Included', type: 'array' },
    ],
  },
  {
    name: 'Financing',
    fields: [
      {
        path: 'financing.type', label: 'Financing Type', type: 'select',
        options: ['conventional', 'FHA', 'VA', 'cash', 'other'],
        required: true,
      },
      { path: 'financing.downPaymentPercent', label: 'Down Payment (%)', type: 'number' },
      { path: 'financing.loanAmount', label: 'Loan Amount ($)', type: 'number' },
      { path: 'financing.lenderName', label: 'Lender Name', type: 'string' },
      { path: 'financing.preApprovalAmount', label: 'Pre-Approval Amount ($)', type: 'number' },
    ],
  },
  {
    name: 'Contingencies',
    fields: [
      { path: 'contingencies.financingContingency', label: 'Financing Contingency', type: 'boolean', required: true },
      { path: 'contingencies.financingDeadlineDays', label: 'Financing Deadline (days)', type: 'number' },
      { path: 'contingencies.inspectionContingency', label: 'Inspection Contingency', type: 'boolean', required: true },
      { path: 'contingencies.inspectionDeadlineDays', label: 'Inspection Deadline (days)', type: 'number' },
      { path: 'contingencies.saleContingency', label: 'Sale of Buyer\'s Property', type: 'boolean' },
      { path: 'contingencies.salePropertyAddress', label: 'Property to be Sold Address', type: 'string' },
      { path: 'contingencies.saleDeadlineDays', label: 'Sale Contingency Deadline (days)', type: 'number' },
    ],
  },
  {
    name: 'Additional',
    fields: [
      { path: 'additionalTerms', label: 'Additional Terms', type: 'string' },
      { path: 'agentNotes', label: 'Agent Notes (internal)', type: 'string' },
    ],
  },
];
