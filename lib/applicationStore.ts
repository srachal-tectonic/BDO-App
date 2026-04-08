'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IndividualApplicant,
  BusinessEntity,
  SBAEligibility,
  SellerInfo,
  SourcesUses,
  LoanDetails,
  ProjectOverview,
  DSCR
} from '@/lib/schema';
import type { FeeDisclosure159 } from '@/types';

// Other Owned Business data structure
export interface OwnershipPercentage {
  ownerName: string;
  percentage: number;
  roleInBusiness: 'active-full-time' | 'active-part-time' | 'passive' | '';
}

export interface FinancingSource {
  id: string;
  financingType: string;
  guaranteePercent: number;
  amount: number;
  rateType: string;
  termYears: number;
  amortizationMonths: number;
  baseRate: number;
  spread: number;
  totalRate: number;
}

export interface OtherOwnedBusiness {
  id: string;
  businessName: string;
  ownershipPercentages: OwnershipPercentage[];
  industry: string;
  corporateGuarantor?: boolean;
}

export interface OtherOwnedBusinessesData {
  hasOtherBusinesses: 'yes' | 'no' | null;
  businesses: OtherOwnedBusiness[];
}

// Personal Financial Statement data structure
export interface PersonalFinancialStatement {
  name: string;
  asOfDate: string;
  cashOnHand: string;
  savingsAccounts: string;
  iraRetirement: string;
  accountsReceivable: string;
  lifeInsuranceCashValue: string;
  stocksAndBonds: string;
  realEstate: string;
  automobiles: string;
  otherPersonalProperty: string;
  otherAssets: string;
  accountsPayable: string;
  notesPayableToBanks: string;
  installmentAccountAuto: string;
  installmentAccountAutoPayments: string;
  installmentAccountOther: string;
  installmentAccountOtherPayments: string;
  loansAgainstLifeInsurance: string;
  mortgagesOnRealEstate: string;
  unpaidTaxes: string;
  otherLiabilities: string;
  salary: string;
  netInvestmentIncome: string;
  realEstateIncome: string;
  otherIncome: string;
  otherIncomeDescription: string;
  asEndorserOrCoMaker: string;
  legalClaimsJudgments: string;
  provisionFederalIncomeTax: string;
  otherSpecialDebt: string;
  notesPayable: Array<{
    noteholder: string;
    originalBalance: string;
    currentBalance: string;
    paymentAmount: string;
    frequency: string;
    collateral: string;
  }>;
  securities: Array<{
    numberOfShares: string;
    nameOfSecurities: string;
    cost: string;
    marketValue: string;
    dateOfQuotation: string;
    totalValue: string;
  }>;
  realEstateOwned: Array<{
    type: string;
    address: string;
    datePurchased: string;
    originalCost: string;
    presentMarketValue: string;
    mortgageHolder: string;
    mortgageAccountNumber: string;
    mortgageBalance: string;
    monthlyPayment: string;
    status: string;
  }>;
  otherPersonalPropertyDescription: string;
  unpaidTaxesDescription: string;
  otherLiabilitiesDescription: string;
  lifeInsuranceDescription: string;
}

// Define the application data structure
export interface ApplicationData {
  projectId?: string; // Track which project this data belongs to
  projectOverview: Partial<ProjectOverview>;
  sourcesUses: Partial<SourcesUses>; // Deprecated: kept for backwards compatibility
  sourcesUses7a: Partial<SourcesUses>; // 7(a) Standard table data
  sourcesUses504: Partial<SourcesUses>; // SBA 504 table data
  sourcesUsesExpress: Partial<SourcesUses>; // 7(a) Express table data
  loan1: Partial<LoanDetails>;
  loan2: Partial<LoanDetails>;
  dscr: Partial<DSCR>;
  individualApplicants: IndividualApplicant[];
  businessApplicant: Partial<BusinessEntity> | null;
  sbaEligibility: Partial<SBAEligibility> | null;
  sellerInfo: Partial<SellerInfo> | null;
  uploadedFiles: any[];
  personalFinancialStatements: Record<string, PersonalFinancialStatement>;
  otherOwnedBusinesses: OtherOwnedBusinessesData;
  financingSources: FinancingSource[];
  // SBA Form 159 - Fee Disclosure Form data
  feeDisclosure: Partial<FeeDisclosure159> | null;
}

// Define the application store interface
export interface ApplicationStore {
  data: ApplicationData;

  // Project Overview actions
  updateProjectOverview: (updates: Partial<ProjectOverview>) => void;

  // Funding Structure actions
  updateSourcesUses: (updates: Partial<SourcesUses>) => void; // Deprecated: kept for backwards compatibility
  updateSourcesUses7a: (updates: Partial<SourcesUses>) => void;
  updateSourcesUses504: (updates: Partial<SourcesUses>) => void;
  updateSourcesUsesExpress: (updates: Partial<SourcesUses>) => void;
  updateAllSourcesUses: (updates: {
    sourcesUses7a?: Partial<SourcesUses>;
    sourcesUses504?: Partial<SourcesUses>;
    sourcesUsesExpress?: Partial<SourcesUses>;
  }) => void;
  updateLoan1: (updates: Partial<LoanDetails>) => void;
  updateLoan2: (updates: Partial<LoanDetails>) => void;
  updateDSCR: (updates: Partial<DSCR>) => void;

  // Individual Applicants actions
  addIndividualApplicant: (applicant?: Partial<IndividualApplicant>) => string;
  updateIndividualApplicant: (id: string, updates: Partial<IndividualApplicant>) => void;
  removeIndividualApplicant: (id: string) => void;

  // Business Applicant actions
  updateBusinessApplicant: (updates: Partial<BusinessEntity>) => void;

  // SBA Eligibility actions
  updateSBAEligibility: (updates: Partial<SBAEligibility>) => void;

  // Seller Info actions
  updateSellerInfo: (updates: Partial<SellerInfo>) => void;

  // Fee Disclosure actions (SBA Form 159)
  updateFeeDisclosure: (updates: Partial<FeeDisclosure159>) => void;

  // Personal Financial Statement actions
  updatePersonalFinancialStatement: (applicantId: string, pfsData: PersonalFinancialStatement) => void;

  // Other Owned Businesses actions
  updateOtherOwnedBusinesses: (updates: Partial<OtherOwnedBusinessesData>) => void;

  // Financing Sources actions
  addFinancingSource: (source: FinancingSource) => void;
  removeFinancingSource: (id: string) => void;
  updateFinancingSource: (id: string, updates: Partial<FinancingSource>) => void;

  // File actions
  addFile: (file: any) => void;
  removeFile: (fileId: string) => void;

  // General actions
  reset: () => void;
  initializeFromProject: (projectData: any) => void;
  loadFromFirestore: (firestoreData: ApplicationData) => void;
}

// Default Sources & Uses state for each table
const defaultSourcesUses: Partial<SourcesUses> = {
  loanAmount: 0,
  sellerFinancing: 0,
  equityInjection: 0,
  otherSources: 0,
  totalSources: 0,
  purchasePrice: 0,
  workingCapital: 0,
  closingCosts: 0,
  contingency: 0,
  otherUses: 0,
  totalUses: 0,
  gap: 0,
};

const initialData: ApplicationData = {
  projectOverview: {
    projectName: '',
    bdoName: '',
    bdaName: '',
    industry: '',
    naicsCode: '',
    primaryProjectPurpose: [],
  },
  sourcesUses: { ...defaultSourcesUses }, // Deprecated
  sourcesUses7a: { ...defaultSourcesUses },
  sourcesUses504: { ...defaultSourcesUses },
  sourcesUsesExpress: { ...defaultSourcesUses },
  loan1: {},
  loan2: {},
  dscr: {
    period1: '',
    period2: '',
    period3: '',
    period4: '',
    dscr1: null,
    dscr2: null,
    dscr3: null,
    dscr4: null,
  },
  individualApplicants: [],
  businessApplicant: null,
  sbaEligibility: null,
  sellerInfo: null,
  uploadedFiles: [],
  personalFinancialStatements: {},
  otherOwnedBusinesses: {
    hasOtherBusinesses: null,
    businesses: [],
  },
  financingSources: [],
  feeDisclosure: null,
};

export const useApplicationStore = create<ApplicationStore>()(
  persist(
    (set) => ({
      data: initialData,

      updateProjectOverview: (updates) => set((state) => ({
        data: {
          ...state.data,
          projectOverview: { ...state.data.projectOverview, ...updates },
        },
      })),

      updateSourcesUses: (updates) => set((state) => ({
        data: {
          ...state.data,
          sourcesUses: { ...state.data.sourcesUses, ...updates },
        },
      })),

      updateSourcesUses7a: (updates) => set((state) => ({
        data: {
          ...state.data,
          sourcesUses7a: { ...state.data.sourcesUses7a, ...updates },
        },
      })),

      updateSourcesUses504: (updates) => set((state) => ({
        data: {
          ...state.data,
          sourcesUses504: { ...state.data.sourcesUses504, ...updates },
        },
      })),

      updateSourcesUsesExpress: (updates) => set((state) => ({
        data: {
          ...state.data,
          sourcesUsesExpress: { ...state.data.sourcesUsesExpress, ...updates },
        },
      })),

      updateAllSourcesUses: (updates) => set((state) => ({
        data: {
          ...state.data,
          ...(updates.sourcesUses7a && { sourcesUses7a: { ...state.data.sourcesUses7a, ...updates.sourcesUses7a } }),
          ...(updates.sourcesUses504 && { sourcesUses504: { ...state.data.sourcesUses504, ...updates.sourcesUses504 } }),
          ...(updates.sourcesUsesExpress && { sourcesUsesExpress: { ...state.data.sourcesUsesExpress, ...updates.sourcesUsesExpress } }),
        },
      })),

      updateLoan1: (updates) => set((state) => ({
        data: {
          ...state.data,
          loan1: { ...state.data.loan1, ...updates },
        },
      })),

      updateLoan2: (updates) => set((state) => ({
        data: {
          ...state.data,
          loan2: { ...state.data.loan2, ...updates },
        },
      })),

      updateDSCR: (updates) => set((state) => ({
        data: {
          ...state.data,
          dscr: { ...state.data.dscr, ...updates },
        },
      })),

      addIndividualApplicant: (applicant) => {
        const newId = `applicant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newApplicant: IndividualApplicant = {
          id: newId,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          ssn: '',
          ownershipPercentage: 0,
          address: { street1: '', city: '', state: '', zipCode: '' },
          ...applicant,
        };
        set((state) => ({
          data: {
            ...state.data,
            individualApplicants: [...state.data.individualApplicants, newApplicant],
          },
        }));
        return newId;
      },

      updateIndividualApplicant: (id, updates) => set((state) => ({
        data: {
          ...state.data,
          individualApplicants: state.data.individualApplicants.map((applicant) =>
            applicant.id === id ? { ...applicant, ...updates } : applicant
          ),
        },
      })),

      removeIndividualApplicant: (id) => set((state) => ({
        data: {
          ...state.data,
          individualApplicants: state.data.individualApplicants.filter(
            (applicant) => applicant.id !== id
          ),
        },
      })),

      updateBusinessApplicant: (updates) => set((state) => ({
        data: {
          ...state.data,
          businessApplicant: { ...state.data.businessApplicant, ...updates },
        },
      })),

      updateSBAEligibility: (updates) => set((state) => ({
        data: {
          ...state.data,
          sbaEligibility: { ...state.data.sbaEligibility, ...updates },
        },
      })),

      updateSellerInfo: (updates) => set((state) => ({
        data: {
          ...state.data,
          sellerInfo: { ...state.data.sellerInfo, ...updates },
        },
      })),

      updateFeeDisclosure: (updates) => set((state) => ({
        data: {
          ...state.data,
          feeDisclosure: { ...state.data.feeDisclosure, ...updates },
        },
      })),

      updatePersonalFinancialStatement: (applicantId, pfsData) => set((state) => ({
        data: {
          ...state.data,
          personalFinancialStatements: {
            ...state.data.personalFinancialStatements,
            [applicantId]: pfsData,
          },
        },
      })),

      updateOtherOwnedBusinesses: (updates) => set((state) => ({
        data: {
          ...state.data,
          otherOwnedBusinesses: { ...state.data.otherOwnedBusinesses, ...updates },
        },
      })),

      addFinancingSource: (source) => set((state) => ({
        data: {
          ...state.data,
          financingSources: [...state.data.financingSources, source],
        },
      })),

      removeFinancingSource: (id) => set((state) => ({
        data: {
          ...state.data,
          financingSources: state.data.financingSources.filter(s => s.id !== id),
        },
      })),

      updateFinancingSource: (id, updates) => set((state) => ({
        data: {
          ...state.data,
          financingSources: state.data.financingSources.map(s =>
            s.id === id ? { ...s, ...updates } : s
          ),
        },
      })),

      addFile: (file) => set((state) => ({
        data: {
          ...state.data,
          uploadedFiles: [...state.data.uploadedFiles, file],
        },
      })),

      removeFile: (fileId) => set((state) => ({
        data: {
          ...state.data,
          uploadedFiles: state.data.uploadedFiles.filter((f: any) => f.id !== fileId),
        },
      })),

      reset: () => set({ data: initialData }),

      initializeFromProject: (projectData) => set((state) => {
        // Check if we're switching to a different project
        const isDifferentProject = state.data.projectId && state.data.projectId !== projectData.id;

        // If it's a different project, reset and initialize with new data
        if (isDifferentProject) {
          return {
            data: {
              ...initialData,
              projectId: projectData.id,
              projectOverview: {
                projectName: projectData.projectName || '',
                bdoName: projectData.bdoUserName || '',
                bdaName: '',
                industry: projectData.businessType || '',
                naicsCode: '',
                primaryProjectPurpose: [],
                projectDescription: '',
              },
              businessApplicant: {
                legalName: projectData.businessName || '',
              },
              sourcesUses: {
                ...initialData.sourcesUses,
                loanAmount: projectData.loanAmount || 0,
              },
              sourcesUses7a: {
                ...initialData.sourcesUses7a,
                loanAmount: projectData.loanAmount || 0,
              },
              sourcesUses504: { ...initialData.sourcesUses504 },
              sourcesUsesExpress: { ...initialData.sourcesUsesExpress },
            },
          };
        }

        // If it's the same project and already has data, don't overwrite
        const hasSameProjectData = state.data.projectId === projectData.id && state.data.projectOverview.projectName !== '';

        if (hasSameProjectData) {
          return state;
        }

        // First time loading this project, initialize with project data
        return {
          data: {
            ...state.data,
            projectId: projectData.id,
            projectOverview: {
              projectName: projectData.projectName || '',
              bdoName: projectData.bdoUserName || '',
              bdaName: state.data.projectOverview.bdaName || '',
              industry: projectData.businessType || '',
              naicsCode: state.data.projectOverview.naicsCode || '',
              primaryProjectPurpose: [],
              projectDescription: '',
            },
            businessApplicant: {
              ...state.data.businessApplicant,
              legalName: projectData.businessName || '',
            },
            sourcesUses: {
              ...state.data.sourcesUses,
              loanAmount: projectData.loanAmount || 0,
            },
            sourcesUses7a: {
              ...state.data.sourcesUses7a,
              loanAmount: projectData.loanAmount || 0,
            },
            sourcesUses504: state.data.sourcesUses504 || { ...defaultSourcesUses },
            sourcesUsesExpress: state.data.sourcesUsesExpress || { ...defaultSourcesUses },
          },
        };
      }),

      loadFromFirestore: (firestoreData) => set(() => ({
        data: {
          ...firestoreData,
          // Ensure new fields have defaults even if not in firestoreData
          sourcesUses7a: firestoreData.sourcesUses7a || { ...defaultSourcesUses },
          sourcesUses504: firestoreData.sourcesUses504 || { ...defaultSourcesUses },
          sourcesUsesExpress: firestoreData.sourcesUsesExpress || { ...defaultSourcesUses },
        },
      })),
    }),
    {
      name: 'application-storage',
      // Merge persisted state with initial state to ensure new fields have defaults
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { data?: Partial<ApplicationData> } | undefined;
        if (!persisted?.data) {
          return currentState;
        }
        return {
          ...currentState,
          data: {
            ...currentState.data,
            ...persisted.data,
            // Ensure new sourcesUses fields have defaults even if not in persisted data
            sourcesUses7a: persisted.data.sourcesUses7a || { ...defaultSourcesUses },
            sourcesUses504: persisted.data.sourcesUses504 || { ...defaultSourcesUses },
            sourcesUsesExpress: persisted.data.sourcesUsesExpress || { ...defaultSourcesUses },
          },
        };
      },
    }
  )
);

// Hook for easier usage - returns the entire store
export const useApplication = () => {
  const store = useApplicationStore();
  return store;
};
