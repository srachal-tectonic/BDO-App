// User Types
export interface UserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'BDO' | 'Manager' | 'PQ Committee' | 'Admin' | 'Borrower';
}

// Spreads Workbook Types
export interface SpreadsWorkbook {
  workbookId: string;
  workbookUrl: string;
  workbookName: string;
  label?: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  cellsPopulated?: number;
  sheetsUpdated?: string[];
  lastSyncedAt?: Date;
}

// Project Status Type
export type ProjectStatus = 'Leads' | 'PQ Prep' | 'PQ Advance' | 'PQ Reject' | 'UW' | 'Closing' | 'Withdraw | Decline';

// Project Types
export interface Project {
  id: string;
  projectName: string;
  businessName: string;
  stage: ProjectStatus;
  status: 'Active' | 'On Hold' | 'Closed';
  bdoUserId: string;
  bdoUserName: string;
  borrowerUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  loanAmount?: number;
  businessType?: string;
  location?: string;
  sharepointFolderId?: string;
  sharepointFolderUrl?: string;
  // Legacy fields (kept for backward compatibility)
  spreadsWorkbookId?: string;
  spreadsWorkbookUrl?: string;
  // Legacy single workbook field (kept for migration)
  spreadsWorkbook?: SpreadsWorkbook;
  // Multiple spreads workbooks per project
  spreadsWorkbooks?: SpreadsWorkbook[];
  // Primary spread workbook ID for populating Sources & Uses tables
  primarySpreadId?: string;
  // Per-project list of Business Questionnaire rule IDs the user has removed from the read-only view.
  // Cleared when the user clicks "Regenerate Questions".
  hiddenQuestionnaireRuleIds?: string[];
  // Soft delete
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

// Loan Types
export interface Loan {
  id: string;
  projectId: string;
  fundingStructureId?: string;
  loanType: string;
  loanAmount: number;
  interestRate?: number;
  term?: number;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  createdAt: Date;
  updatedAt: Date;
  loanDetails?: Record<string, any>;
}

// Funding Structure Types
export interface FundingStructure {
  id: string;
  projectId: string;
  structureName: string;
  totalAmount: number;
  loanIds: string[];
  reviewStatus?: 'Pending' | 'Reviewed' | 'Approved';
  createdAt: Date;
  updatedAt: Date;
}

// Document Types
export interface Document {
  id: string;
  projectId: string;
  documentName: string;
  documentType: string;
  fileUrl?: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: 'Requested' | 'Uploaded' | 'Approved' | 'Rejected';
  requestedAt?: Date;
}

// Broker Token Types
export interface BrokerToken {
  id: string;                    // Document ID = token value
  projectId: string;             // Reference to the project
  createdAt: Date;               // When the token was created
  expiresAt: Date;               // When the token expires (default: 30 days)
  createdBy: string;             // BDO user ID who created the token
  createdByName: string;         // BDO user name for display
  isRevoked: boolean;            // Manual revocation flag
  brokerEmail?: string;          // Optional: broker's email for tracking
  brokerName?: string;           // Optional: broker's name for tracking
  lastAccessedAt?: Date;         // Last time the token was used
  uploadCount: number;           // Number of files uploaded via this token
}

// Business Entity Types
export interface BusinessEntity {
  id: string;
  projectId: string;
  businessName: string;
  entityType: string;
  ein?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields for loan application
  entityToBeFormed?: boolean;
  legalName?: string;
  yearsInOperation?: number;
  website?: string;
  businessAddress?: {
    street1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  projectAddress?: {
    street1: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

// Form Field Configuration
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'currency' | 'date' | 'select' | 'checkbox' | 'textarea' | 'readonly';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
  dependsOn?: {
    field: string;
    value: any;
  };
}

// Navigation Item Types
export interface NavItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  items?: NavItem[];
}

// Note Types
export interface Note {
  id: string;
  projectId: string;
  content: string;
  tags: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  isFollowUp?: boolean;
}

// PDF Tools Types

export interface PdfFieldMapping {
  pdfFieldName: string;
  pdfFieldType: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'date';
  appSection: 'projectOverview' | 'fundingStructure' | 'businessApplicant' | 'individualApplicants' | 'sbaEligibility' | 'sellerInfo' | 'businessQuestionnaire';
  appFieldPath: string;
  transformType: 'direct' | 'format' | 'calculate';
  transformConfig?: Record<string, any>;
}

export interface ExtractedField {
  name: string;
  type: string;
  value: string | boolean | null;
  options?: string[];
}

export interface PdfImportSession {
  id: string;
  projectId: string;
  fileName: string;
  fileSize?: number;
  extractedFields: ExtractedField[];
  appliedMappings?: PdfFieldMapping[];
  status: 'uploaded' | 'mapped' | 'applied';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
}

export interface PdfMappingTemplate {
  id: string;
  name: string;
  sourceFormName: string;
  mappings: PdfFieldMapping[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
}

export interface AppFieldDefinition {
  path: string;
  label: string;
  type: string;
}

export interface AppSection {
  label: string;
  fields: AppFieldDefinition[];
}

// Form Portal Types (Public Borrower Forms Access)
export interface FormPortalToken {
  token: string;
  projectId: string;
  createdAt: Date;
  expiresAt: Date;
  createdBy: string;
  createdByName: string;
  isRevoked: boolean;
}

export interface BorrowerUpload {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  storagePath: string;
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
  relatedFormId?: string;
  // Extraction fields
  extractionStatus?: ExtractionStatus;
  detectedFormType?: SbaFormType | null;
  extractionId?: string | null;
}

// PDF Extraction Types
export type ExtractionStatus =
  | 'pending'
  | 'extracting'
  | 'extracted'
  | 'reviewed'
  | 'applied'
  | 'failed'
  | 'not_applicable';

export type SbaFormType =
  | 'sba-1919'
  | 'sba-413'
  | 'sba-912'
  | 'irs-4506c'
  | 'sba-159'
  | 'unknown';

export type ExtractedFieldStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export interface ExtractedFieldValue {
  pdfFieldName: string;
  rawValue: string | boolean | null;
  mappedSection?: string;
  mappedPath?: string;
  mappedLabel?: string;
  transformedValue?: unknown;
  confidence: number;
  status: ExtractedFieldStatus;
  editedValue?: unknown;
}

export interface ExtractionRecord {
  id: string;
  uploadId: string;
  projectId: string;
  formType: SbaFormType | null;
  extractedAt: Date;
  status: ExtractionStatus;
  fields: ExtractedFieldValue[];
  totalFields: number;
  mappedFields: number;
  filledFields: number;
  averageConfidence: number;
  possibleIssues: string[];
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  appliedBy?: string;
  appliedByName?: string;
  appliedAt?: Date;
  error?: string;
}

export interface ExtractionHistoryEntry {
  id: string;
  projectId: string;
  extractionId: string;
  uploadId: string;
  uploadFilename: string;
  appliedBy: string;
  appliedByName: string;
  appliedAt: Date;
  fieldsApplied: number;
  changes: ExtractionChange[];
}

export interface ExtractionChange {
  section: string;
  fieldPath: string;
  fieldLabel?: string;
  oldValue: unknown;
  newValue: unknown;
}

// =============================================================================
// SBA Form 159 - Fee Disclosure Form Data Types
// =============================================================================

/**
 * SBA Form 159 - Fee Disclosure and Compensation Agreement
 * For use with 7(a) and 504 Loan Programs
 *
 * This interface stores all 47 fillable fields from the PDF form.
 * All fields map to the `feeDisclosure` section in the loan application.
 */
export interface FeeDisclosure159 {
  // ----------------------------------------
  // Loan Type Selection (2 checkboxes)
  // ----------------------------------------
  /** 7(a) Loan checkbox */
  loanType7a?: boolean;
  /** 504 Loan checkbox */
  loanType504?: boolean;

  // ----------------------------------------
  // Loan Information (3 text fields)
  // ----------------------------------------
  /** SBA Loan Name */
  sbaLoanName?: string;
  /** SBA Loan Number (10 digit number) */
  sbaLoanNumber?: string;
  /** SBA Location ID (numeric only) */
  sbaLocationId?: string;

  // ----------------------------------------
  // Lender Information (1 text field)
  // ----------------------------------------
  /** SBA Lender Legal Name */
  sbaLenderLegalName?: string;

  // ----------------------------------------
  // Agent Information (3 text fields)
  // ----------------------------------------
  /** Services Performed by (Name of Agent) */
  agentName?: string;
  /** Agent Contact Person */
  agentContactPerson?: string;
  /** Agent Address */
  agentAddress?: string;

  // ----------------------------------------
  // Type of Agent (7 checkboxes + 1 text)
  // ----------------------------------------
  /** Agent Type: SBA Lender */
  agentTypeSbaLender?: boolean;
  /** Agent Type: Independent Loan Packager */
  agentTypeIndependentPackager?: boolean;
  /** Agent Type: Referral Agent/Broker */
  agentTypeReferralBroker?: boolean;
  /** Agent Type: Consultant */
  agentTypeConsultant?: boolean;
  /** Agent Type: Accountant preparing financial statements */
  agentTypeAccountant?: boolean;
  /** Agent Type: Third Party Lender (TPL) */
  agentTypeThirdPartyLender?: boolean;
  /** Agent Type: Other */
  agentTypeOther?: boolean;
  /** Agent Type: Other - Description */
  agentTypeOtherDescription?: string;

  // ----------------------------------------
  // Service Fees - Applicant Paid (5 fields)
  // ----------------------------------------
  /** Loan Packaging Fee paid by Applicant */
  loanPackagingFeeApplicant?: number;
  /** Financial Statement Preparation Fee paid by Applicant */
  financialStatementFeeApplicant?: number;
  /** Broker or Referral Services Fee paid by Applicant */
  brokerReferralFeeApplicant?: number;
  /** Consultant Services Fee paid by Applicant */
  consultantFeeApplicant?: number;
  /** Other Fee paid by Applicant */
  otherFeeApplicant?: number;

  // ----------------------------------------
  // Service Fees - SBA Lender Paid (5 fields)
  // ----------------------------------------
  /** Loan Packaging Fee paid by SBA Lender */
  loanPackagingFeeLender?: number;
  /** Financial Statement Preparation Fee paid by SBA Lender */
  financialStatementFeeLender?: number;
  /** Broker or Referral Services Fee paid by SBA Lender */
  brokerReferralFeeLender?: number;
  /** Consultant Services Fee paid by SBA Lender */
  consultantFeeLender?: number;
  /** Other Fee paid by SBA Lender */
  otherFeeLender?: number;

  // ----------------------------------------
  // Other Service Description (1 field)
  // ----------------------------------------
  /** Other Service Type Description */
  otherServiceDescription?: string;

  // ----------------------------------------
  // Compensation Totals (2 fields)
  // ----------------------------------------
  /** Total Compensation paid by Applicant */
  totalCompensationApplicant?: number;
  /** Total Compensation paid by SBA Lender */
  totalCompensationLender?: number;

  // ----------------------------------------
  // Itemization (1 checkbox)
  // ----------------------------------------
  /** Itemization and supporting documentation is attached */
  itemizationAttached?: boolean;

  // ----------------------------------------
  // 504 Loan Only Section (4 fields)
  // ----------------------------------------
  /** CDC received referral fee from a TPL */
  cdcReceivedReferralFee?: boolean;
  /** Amount of CDC Referral Fee */
  cdcReferralFeeAmount?: number;
  /** Third Party Lender (TPL) Name */
  tplName?: string;
  /** Third Party Lender (TPL) Address */
  tplAddress?: string;

  // ----------------------------------------
  // Applicant Signature Block (4 fields)
  // ----------------------------------------
  /** Applicant Signature (typically empty or "[SIGNATURE]") */
  applicantSignature?: string;
  /** Applicant Signature Date */
  applicantSignatureDate?: string;
  /** Applicant Print Name */
  applicantPrintName?: string;
  /** Applicant Title */
  applicantTitle?: string;

  // ----------------------------------------
  // Agent Signature Block (4 fields)
  // ----------------------------------------
  /** Agent Signature (typically empty or "[SIGNATURE]") */
  agentSignature?: string;
  /** Agent Signature Date */
  agentSignatureDate?: string;
  /** Agent Print Name */
  agentPrintName?: string;
  /** Agent Title */
  agentTitle?: string;

  // ----------------------------------------
  // SBA Lender Signature Block (4 fields)
  // ----------------------------------------
  /** SBA Lender Signature (typically empty or "[SIGNATURE]") */
  lenderSignature?: string;
  /** SBA Lender Signature Date */
  lenderSignatureDate?: string;
  /** SBA Lender Print Name */
  lenderPrintName?: string;
  /** SBA Lender Title */
  lenderTitle?: string;

  // ----------------------------------------
  // Metadata (tracking fields)
  // ----------------------------------------
  /** When the fee disclosure data was last updated */
  updatedAt?: Date;
  /** User ID who last updated the data */
  updatedBy?: string;
  /** User name who last updated the data */
  updatedByName?: string;
  /** Source of the data (manual entry or PDF extraction) */
  dataSource?: 'manual' | 'pdf-extraction';
  /** Extraction record ID if data came from PDF extraction */
  extractionId?: string;
}

/**
 * Helper type for agent type checkboxes
 */
export type AgentType =
  | 'sbaLender'
  | 'independentPackager'
  | 'referralBroker'
  | 'consultant'
  | 'accountant'
  | 'thirdPartyLender'
  | 'other';

/**
 * Helper type for service fee categories
 */
export type ServiceFeeType =
  | 'loanPackaging'
  | 'financialStatement'
  | 'brokerReferral'
  | 'consultant'
  | 'other';

/**
 * Summary of fees for display purposes
 */
export interface FeeDisclosureSummary {
  /** Total fees paid by Applicant */
  totalApplicantFees: number;
  /** Total fees paid by SBA Lender */
  totalLenderFees: number;
  /** Grand total of all fees */
  grandTotal: number;
  /** Whether form is for 7(a) or 504 loan */
  loanType: '7a' | '504' | null;
  /** Agent type(s) selected */
  agentTypes: AgentType[];
  /** Whether itemization is attached */
  hasItemization: boolean;
}
