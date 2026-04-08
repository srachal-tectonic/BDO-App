// Type definitions for the application

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface IndividualApplicant {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  ownershipPercentage: number;
  address: Address;
  homeAddress?: Address;
  role?: string;
  title?: string;
  gender?: string;
  ownershipType?: string;
  indirectOwnershipDescription?: string;
  projectRole?: string;
  businessRole?: string;
  businessRoleDescription?: string;
  experience?: string;
  yearsOfExperience?: string;
  creditScore?: string;
  estimatedCreditScore?: string;
  creditScoreExplanation?: string;
  travelTime?: string;
  planToBeOnSite?: string;
  netWorth?: string;
  pcLiquidity?: string;
  reqDraw?: string;
  equityInjectionAmount?: string;
  // File references
  taxReturnIds?: string[];
  financialStatementIds?: string[];
  resumeIds?: string[];
  otherFileIds?: string[];
}

export interface BusinessEntity {
  id: string;
  legalName: string;
  dba?: string;
  ein: string;
  entityType: string;
  formationDate: string;
  stateOfFormation: string;
  address: Address;
  phone?: string;
  email?: string;
  website?: string;
  industryType?: string;
  naicsCode?: string;
  ownershipPercentage?: number;
  // Additional fields for loan application
  entityToBeFormed?: boolean;
  sameAsSubjectBusiness?: boolean;
  yearsInOperation?: number;
  dbaName?: string;
  yearEstablished?: string;
  existingEmployees?: string;
  jobsSavedRetained?: string;
  newFTEJobsCreated?: string;
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

export interface SourcesUsesRow {
  tBankLoan?: number;    // Primary SBA 7(a) loan from T Bank
  borrower?: number;     // Borrower's equity injection
  sellerNote?: number;   // Seller financing
  thirdParty?: number;   // Third-party financing
  sbaTerm?: number;      // SBA loan term in months for this use category
}

// ============================================================================
// New Sources & Uses Table Interfaces (Three Tables from Spreads)
// ============================================================================

/**
 * Row type for 7(a) Standard and 7(a) Express tables
 * These tables use "3rd Party" as the fourth funding source column
 */
export interface SourcesUsesRow7a {
  tBankLoan?: number;    // T Bank Loan amount
  borrower?: number;     // Borrower equity injection
  sellerNote?: number;   // Seller financing
  thirdParty?: number;   // Third-party financing
  total?: number;        // Row total (calculated)
  sbaTerm?: number;      // SBA loan term in years
  percentage?: number;   // Percentage of total project (calculated)
  weight?: number;       // Weighted term calculation (calculated)
}

/**
 * Row type for SBA 504 table
 * This table uses "CDC 504" instead of "3rd Party" as the fourth funding source
 */
export interface SourcesUsesRow504 {
  tBankLoan?: number;    // T Bank Loan amount
  borrower?: number;     // Borrower equity injection
  sellerNote?: number;   // Seller financing
  cdc504?: number;       // CDC 504 loan amount (replaces thirdParty)
  total?: number;        // Row total (calculated)
  sbaTerm?: number;      // SBA loan term in years
  percentage?: number;   // Percentage of total project (calculated)
  weight?: number;       // Weighted term calculation (calculated)
}

/**
 * Row category keys matching the spreadsheet rows
 */
export type SourcesUsesCategory =
  | 'realEstateAcquisition'
  | 'debtRefiCRE'
  | 'debtRefiNonCRE'
  | 'machineryEquipment'
  | 'furnitureFixtures'
  | 'inventory'
  | 'workingCapital'
  | 'workingCapitalPreOpening'
  | 'businessAcquisition'
  | 'franchiseFees'
  | 'constructionHardCosts'
  | 'interimInterestReserve'
  | 'constructionContingency'
  | 'otherConstructionSoftCosts'
  | 'closingCosts'
  | 'sbaGtyFee';

/**
 * Complete Sources & Uses table for 7(a) Standard loan program
 * Synced from spreads "2. Sources and Uses" rows 2-24
 */
export interface SourcesUses7a {
  realEstateAcquisition?: SourcesUsesRow7a;
  debtRefiCRE?: SourcesUsesRow7a;
  debtRefiNonCRE?: SourcesUsesRow7a;
  machineryEquipment?: SourcesUsesRow7a;
  furnitureFixtures?: SourcesUsesRow7a;
  inventory?: SourcesUsesRow7a;
  workingCapital?: SourcesUsesRow7a;
  workingCapitalPreOpening?: SourcesUsesRow7a;
  businessAcquisition?: SourcesUsesRow7a;
  franchiseFees?: SourcesUsesRow7a;
  constructionHardCosts?: SourcesUsesRow7a;
  interimInterestReserve?: SourcesUsesRow7a;
  constructionContingency?: SourcesUsesRow7a;
  otherConstructionSoftCosts?: SourcesUsesRow7a;
  closingCosts?: SourcesUsesRow7a;
  sbaGtyFee?: SourcesUsesRow7a;
  // Totals row
  totals?: SourcesUsesRow7a;
  // Column percentages
  columnPercentages?: {
    tBankLoan?: number;
    borrower?: number;
    sellerNote?: number;
    thirdParty?: number;
    total?: number;
  };
  // Weighted term
  weightedTerm?: number;
}

/**
 * Complete Sources & Uses table for SBA 504 loan program
 * Synced from spreads "2. Sources and Uses" rows 26-48
 */
export interface SourcesUses504 {
  realEstateAcquisition?: SourcesUsesRow504;
  debtRefiCRE?: SourcesUsesRow504;
  debtRefiNonCRE?: SourcesUsesRow504;
  machineryEquipment?: SourcesUsesRow504;
  furnitureFixtures?: SourcesUsesRow504;
  inventory?: SourcesUsesRow504;
  workingCapital?: SourcesUsesRow504;
  workingCapitalPreOpening?: SourcesUsesRow504;
  businessAcquisition?: SourcesUsesRow504;
  franchiseFees?: SourcesUsesRow504;
  constructionHardCosts?: SourcesUsesRow504;
  interimInterestReserve?: SourcesUsesRow504;
  constructionContingency?: SourcesUsesRow504;
  otherConstructionSoftCosts?: SourcesUsesRow504;
  closingCosts?: SourcesUsesRow504;
  sbaGtyFee?: SourcesUsesRow504;
  // Totals row
  totals?: SourcesUsesRow504;
  // Column percentages
  columnPercentages?: {
    tBankLoan?: number;
    borrower?: number;
    sellerNote?: number;
    cdc504?: number;
    total?: number;
  };
  // Weighted term
  weightedTerm?: number;
}

/**
 * Complete Sources & Uses table for 7(a) Express loan program
 * Synced from spreads "2. Sources and Uses" rows 50-72
 */
export interface SourcesUsesExpress {
  realEstateAcquisition?: SourcesUsesRow7a;
  debtRefiCRE?: SourcesUsesRow7a;
  debtRefiNonCRE?: SourcesUsesRow7a;
  machineryEquipment?: SourcesUsesRow7a;
  furnitureFixtures?: SourcesUsesRow7a;
  inventory?: SourcesUsesRow7a;
  workingCapital?: SourcesUsesRow7a;
  workingCapitalPreOpening?: SourcesUsesRow7a;
  businessAcquisition?: SourcesUsesRow7a;
  franchiseFees?: SourcesUsesRow7a;
  constructionHardCosts?: SourcesUsesRow7a;
  interimInterestReserve?: SourcesUsesRow7a;
  constructionContingency?: SourcesUsesRow7a;
  otherConstructionSoftCosts?: SourcesUsesRow7a;
  closingCosts?: SourcesUsesRow7a;
  sbaGtyFee?: SourcesUsesRow7a;
  // Totals row
  totals?: SourcesUsesRow7a;
  // Column percentages
  columnPercentages?: {
    tBankLoan?: number;
    borrower?: number;
    sellerNote?: number;
    thirdParty?: number;
    total?: number;
  };
  // Weighted term
  weightedTerm?: number;
}

/**
 * Groups all three Sources & Uses tables for a project
 */
export interface ProjectSourcesUses {
  sourcesUses7a?: SourcesUses7a;
  sourcesUses504?: SourcesUses504;
  sourcesUsesExpress?: SourcesUsesExpress;
  lastSyncedAt?: Date;
}

/**
 * Loan program type identifier
 */
export type LoanProgramType = '7a' | '504' | 'express';

// ============================================================================
// End of New Sources & Uses Table Interfaces
// ============================================================================

export interface SourcesUses {
  // Sources
  loanAmount: number;
  sellerFinancing: number;
  equityInjection: number;
  otherSources: number;
  totalSources: number;

  // Uses
  purchasePrice: number;
  workingCapital: number;
  closingCosts: number;
  contingency: number;
  otherUses: number;
  totalUses: number;

  // Calculations
  gap: number;

  // Matrix data - allows dynamic category access
  [key: string]: number | SourcesUsesRow | undefined;
}

export interface LoanDetails {
  type?: string;
  amount?: number;
  term?: number;
  baseRate?: string;
  spread?: number;
  totalRate?: number;
  monthlyPayment?: number;
  loanAmount?: number;
  interestRate?: number;
  termMonths?: number;
  amortizationMonths?: number;
  paymentFrequency?: 'monthly' | 'quarterly' | 'annual';
  paymentAmount?: number;
  balloonPayment?: number;
}

export type DSCRPeriod = '2022' | '2023' | '2024' | '2025' | 'Interim' | '';

export interface DSCR {
  period1: DSCRPeriod;
  period2: DSCRPeriod;
  period3: DSCRPeriod;
  period4: DSCRPeriod;
  dscr1: number | null;
  dscr2: number | null;
  dscr3: number | null;
  dscr4: number | null;
}

export interface SellerInfo {
  businessName: string;
  legalName?: string;
  dbaName?: string;
  sellerName: string;
  sellerAddress: Address;
  sellerPhone?: string;
  sellerEmail?: string;
  businessDescription?: string;
  yearsInBusiness?: number;
  reasonForSale?: string;
  website?: string;
  address?: Address;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  yearEstablished?: string;
  purchasePrice?: number;
  typeOfAcquisition?: 'stock' | 'asset' | '';
  purchasing100Percent?: 'yes' | 'no' | '';
  purchaseContractStatus?: 'no_contract' | 'loi_signed' | 'contract_drafted' | 'fully_executed' | '';
  phone?: string;
  email?: string;
  // Acquisition details
  acquisitionType?: 'stock' | 'asset';
  isPurchasing100Percent?: 'yes' | 'no';
  otherOwnersDescription?: string;
  contractStatus?: string;
  hasSellerCarryNote?: 'yes' | 'no';
  sellerCarryNoteTerms?: string;
  realEstatePurchaseDescription?: string;
  // File references
  financialStatementIds?: string[];
  taxReturnIds?: string[];
  otherDocumentIds?: string[];
  loiContractIds?: string[];
}

export interface SBAEligibility {
  // Legacy fields (kept for backwards compatibility)
  isSmallBusiness?: boolean;
  hasDisqualifyingBackground?: boolean;
  hasDelinquentDebt?: boolean;
  hasBankruptcy?: boolean;
  hasJudgments?: boolean;
  hasLiens?: boolean;
  isInGoodStanding?: boolean;
  meetsNetWorthRequirement?: boolean;
  meetsIncomeRequirement?: boolean;
  additionalNotes?: string;

  // Eligibility question answers (yes/no)
  convicted?: 'yes' | 'no';
  arrested?: 'yes' | 'no';
  pendingLawsuits?: 'yes' | 'no';
  childSupport?: 'yes' | 'no';
  taxLiens?: 'yes' | 'no';
  bankruptcy?: 'yes' | 'no';
  federalDebt?: 'yes' | 'no';
  nonCitizenOwner?: 'yes' | 'no';

  // Combined explanation for "Yes" answers
  eligibilityExplanation?: string;

  // Individual explanation fields for "Yes" answers
  convictedExplanation?: string;
  arrestedExplanation?: string;
  pendingLawsuitsExplanation?: string;
  childSupportExplanation?: string;
  taxLiensExplanation?: string;
  bankruptcyExplanation?: string;
  federalDebtExplanation?: string;
}

export interface FileWithYear {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  year?: number;
  category?: string;
}

export interface ProjectOverview {
  projectName: string;
  bdoName: string;
  bdaName: string;
  bdo1?: string;
  bdo2?: string;
  bda?: string;
  referralSource?: string;
  referralIndividual?: string;
  referralFirm?: string;
  referralFee?: number;
  industry: string;
  naicsCode: string;
  primaryProjectPurpose: string[] | string;
  secondaryProjectPurposes?: string[];
  projectDescription?: string;
  goodFitSummary?: string;
  loanWeaknesses?: string;
  affiliatesCorporateGuarantors?: string;
  bdoComments?: string;
  riskRepayment?: number;
  riskManagement?: number;
  riskEquity?: number;
  riskCollateral?: number;
  riskCredit?: number;
  riskLiquidity?: number;
  // Risk Assessment Classification (legacy boolean format)
  riskAssessment?: {
    isStartup?: boolean;
    hasExistingCashflow?: boolean;
    hasTransitionRisk?: boolean;
    includesRealEstate?: boolean;
    creScope?: 'purchase' | 'improvement';
    isPartnerBuyout?: boolean;
    involvesConstruction?: boolean;
    includesDebtRefinance?: boolean;
    debtRefinancePrimary?: boolean;
  };
  // Risk Assessment Classification (Q1-Q5 format)
  classification?: {
    businessStage?: 'startup' | 'existing' | 'acquiring';
    ownershipChange?: 'none' | 'partner-buyout' | 'third-party';
    creComponent?: 'none' | 'purchase' | 'improvements' | 'construction';
    debtRefinance?: 'none' | 'primary' | 'included';
    riskLevelOverride?: RiskLevel | '';
  };
  computedProjectType?: string;
  computedRiskLevel?: RiskLevel;
  matchedRuleId?: string;
}

export interface ApplicationData {
  projectId: string;
  projectOverview: ProjectOverview;
  sourcesUses: SourcesUses;
  // New: Three separate Sources & Uses tables synced from spreads
  projectSourcesUses?: ProjectSourcesUses;
  loanDetails: LoanDetails;
  individualApplicants: IndividualApplicant[];
  businessApplicant: BusinessEntity;
  sbaEligibility: SBAEligibility;
  sellerInfo?: SellerInfo;
  // SBA Form 159 - Fee Disclosure Form data (imported from @/types)
  feeDisclosure?: import('@/types').FeeDisclosure159;
  files: FileWithYear[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
}

// Risk Assessment Types
export type TriStateCondition = boolean | 'any';
export type CREScope = 'purchase' | 'improvement' | 'any';
export type RiskLevel = 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high' | 'very-high';

export interface ProjectTypeRule {
  id: string;
  name: string;
  description?: string;
  riskLevel: RiskLevel;
  isFallback: boolean;
  priority: number;
  // Tristate conditions: true | false | 'any'
  isStartup: TriStateCondition;
  hasExistingCashflow: TriStateCondition;
  hasTransitionRisk: TriStateCondition;
  includesRealEstate: TriStateCondition;
  creScope: CREScope;
  isPartnerBuyout: TriStateCondition;
  involvesConstruction: TriStateCondition;
  includesDebtRefinance: TriStateCondition;
  debtRefinancePrimary: TriStateCondition;
}

export interface RiskAssessmentAnswers {
  isStartup?: boolean;
  hasExistingCashflow?: boolean;
  hasTransitionRisk?: boolean;
  includesRealEstate?: boolean;
  creScope?: 'purchase' | 'improvement';
  isPartnerBuyout?: boolean;
  involvesConstruction?: boolean;
  includesDebtRefinance?: boolean;
  debtRefinancePrimary?: boolean;
}

export interface ComputedRiskAssessment {
  projectType?: string;
  riskLevel?: RiskLevel;
  matchedRuleId?: string;
}

// Re-export for compatibility with @shared/schema imports
export type { IndividualApplicant as IndividualApplicantSchema };
