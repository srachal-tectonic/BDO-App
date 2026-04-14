'use client';

import { BDOLayout } from '@/components/layout/BDOLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTheme, defaultTheme } from '@/contexts/ThemeContext';
import type { ThemeSettings } from '@/contexts/ThemeContext';
import type { CREScope, ProjectTypeRule, RiskLevel, TriStateCondition } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndirectOwnershipExplainer } from '@/components/LearnMorePanel';
import { DollarSign, Edit, FileQuestion, FileType, FileUp, Plus, Save, Settings, ShieldAlert, Tag, Trash2, Users, Wand2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminSettings, saveAdminSettings } from '@/services/firestore';

interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
  description?: string;
}

interface QuestionnaireRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blockType: 'question' | 'ai-generated';
  mainCategory: 'Business Overview' | 'Project Purpose' | 'Industry';
  questionText?: string;
  aiBlockTemplateId?: string;
  purposeKey?: string;
  purposeKeys?: string[];
  excludePurposes?: string[];
  alwaysShow?: boolean;
  naicsCodes?: string[];
  questionOrder?: number;
}

interface AIBlockTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  inputFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number';
    placeholder?: string;
    required: boolean;
  }>;
}

interface DefaultValues {
  wsjPrimeRate: number | null;
  dscrPeriod1: string;
  dscrPeriod2: string;
  dscrPeriod3: string;
  dscrPeriod4: string;
}

type FeeNameType =
  | 'Good Faith Deposit'
  | 'SBA Guarantee Fee'
  | 'Packaging Fee'
  | 'Appraisal Fee'
  | 'Environmental Fee'
  | 'Title Insurance'
  | 'Legal Fees';

interface FeeConfiguration {
  id: string;
  feeName: FeeNameType;
  amount: number;
  includesRealEstate: boolean;
  description: string;
  active: boolean;
}

interface FileUploadInstructions {
  businessApplicant?: string;
  individualApplicants?: string;
  otherBusinesses?: string;
  projectFiles?: string;
}

interface AdminSettings {
  aiPrompts: AIPrompt[];
  questionnaireRules: QuestionnaireRule[];
  aiBlockTemplates: AIBlockTemplate[];
  noteTags: string[];
  defaultValues: DefaultValues;
  projectTypeRules: ProjectTypeRule[];
  fileUploadInstructions?: FileUploadInstructions;
  feeConfigurations?: FeeConfiguration[];
}

interface AppUser {
  uid: string;
  email: string | null;
  role: string;
  displayName?: string | null;
  createdAt: Date;
}

const TEST_USERS: AppUser[] = [
  { uid: 'dev-srachal', email: 'srachal@tectonicfinancial.com', role: 'Admin', displayName: 'Shane Rachal', createdAt: new Date() },
  { uid: 'dev-user-2', email: 'jdoe@tectonicfinancial.com', role: 'BDO', displayName: 'Jane Doe', createdAt: new Date() },
];

interface BorrowerFormField {
  fieldId: string;
  label: string;
  type: 'text' | 'date' | 'currency' | 'percentage' | 'number' | 'select' | 'checkbox' | 'textarea' | 'phone' | 'email' | 'ssn' | 'address';
  required: boolean;
  section?: string;
  applicationPath: string;
}

interface BorrowerFormTemplate {
  id: string;
  name: string;
  description: string;
  applicantType: 'business' | 'individual' | 'seller' | 'project';
  projectPurposes?: string[];
  fields: BorrowerFormField[];
}

const BORROWER_FORM_TEMPLATES: BorrowerFormTemplate[] = [
  {
    id: 'business-information',
    name: 'Business Information',
    description: 'Business entity details including legal name, formation, address, and industry classification.',
    applicantType: 'business',
    fields: [
      { fieldId: 'legalName', label: 'Legal Name', type: 'text', required: true, section: 'Entity Details', applicationPath: 'businessApplicant.legalName' },
      { fieldId: 'dba', label: 'DBA Name', type: 'text', required: false, section: 'Entity Details', applicationPath: 'businessApplicant.dba' },
      { fieldId: 'ein', label: 'EIN', type: 'text', required: true, section: 'Entity Details', applicationPath: 'businessApplicant.ein' },
      { fieldId: 'entityType', label: 'Entity Type', type: 'select', required: true, section: 'Entity Details', applicationPath: 'businessApplicant.entityType' },
      { fieldId: 'formationDate', label: 'Formation Date', type: 'date', required: true, section: 'Entity Details', applicationPath: 'businessApplicant.formationDate' },
      { fieldId: 'stateOfFormation', label: 'State of Formation', type: 'text', required: true, section: 'Entity Details', applicationPath: 'businessApplicant.stateOfFormation' },
      { fieldId: 'phone', label: 'Phone', type: 'phone', required: false, section: 'Contact', applicationPath: 'businessApplicant.phone' },
      { fieldId: 'email', label: 'Email', type: 'email', required: false, section: 'Contact', applicationPath: 'businessApplicant.email' },
      { fieldId: 'website', label: 'Website', type: 'text', required: false, section: 'Contact', applicationPath: 'businessApplicant.website' },
      { fieldId: 'address', label: 'Business Address', type: 'address', required: true, section: 'Address', applicationPath: 'businessApplicant.address' },
      { fieldId: 'naicsCode', label: 'NAICS Code', type: 'text', required: false, section: 'Industry', applicationPath: 'businessApplicant.naicsCode' },
      { fieldId: 'industryType', label: 'Industry Type', type: 'text', required: false, section: 'Industry', applicationPath: 'businessApplicant.industryType' },
      { fieldId: 'yearEstablished', label: 'Year Established', type: 'text', required: false, section: 'Operations', applicationPath: 'businessApplicant.yearEstablished' },
      { fieldId: 'existingEmployees', label: 'Existing Employees', type: 'number', required: false, section: 'Operations', applicationPath: 'businessApplicant.existingEmployees' },
      { fieldId: 'newFTEJobsCreated', label: 'New FTE Jobs Created', type: 'number', required: false, section: 'Operations', applicationPath: 'businessApplicant.newFTEJobsCreated' },
    ],
  },
  {
    id: 'tbank-loan-application',
    name: 'T Bank Loan Application (Consolidated)',
    description: 'Fillable PDF generated per individual applicant. Includes Applicant Info, Ownership Structure, Businesses Owned/Controlled, Project Information, and Borrower Personal Information (Citizenship).',
    applicantType: 'individual',
    fields: [
      { fieldId: 'firstName', label: 'First Name', type: 'text', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.firstName' },
      { fieldId: 'middleName', label: 'Middle Name', type: 'text', required: false, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.middleName' },
      { fieldId: 'lastName', label: 'Last Name', type: 'text', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.lastName' },
      { fieldId: 'ssn', label: 'SSN', type: 'ssn', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.ssn' },
      { fieldId: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.dateOfBirth' },
      { fieldId: 'email', label: 'Email', type: 'email', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.email' },
      { fieldId: 'phone', label: 'Phone', type: 'phone', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.phone' },
      { fieldId: 'address', label: 'Home Address', type: 'address', required: true, section: 'Applicant Info', applicationPath: 'individualApplicants.{index}.address' },
      { fieldId: 'ownershipPercentage', label: 'Ownership %', type: 'percentage', required: true, section: 'Ownership Structure', applicationPath: 'individualApplicants.{index}.ownershipPercentage' },
      { fieldId: 'ownershipType', label: 'Ownership Type', type: 'select', required: false, section: 'Ownership Structure', applicationPath: 'individualApplicants.{index}.ownershipType' },
      { fieldId: 'title', label: 'Title', type: 'text', required: false, section: 'Ownership Structure', applicationPath: 'individualApplicants.{index}.title' },
      { fieldId: 'businessRole', label: 'Role in Business', type: 'text', required: false, section: 'Ownership Structure', applicationPath: 'individualApplicants.{index}.businessRole' },
      { fieldId: 'gender', label: 'Gender', type: 'select', required: false, section: 'Personal Information', applicationPath: 'individualApplicants.{index}.gender' },
      { fieldId: 'experience', label: 'Industry Experience', type: 'textarea', required: false, section: 'Personal Information', applicationPath: 'individualApplicants.{index}.experience' },
      { fieldId: 'yearsOfExperience', label: 'Years of Experience', type: 'text', required: false, section: 'Personal Information', applicationPath: 'individualApplicants.{index}.yearsOfExperience' },
    ],
  },
  {
    id: 'personal-information',
    name: 'Personal Information',
    description: 'Individual applicant personal details, contact information, and background data.',
    applicantType: 'individual',
    fields: [
      { fieldId: 'firstName', label: 'First Name', type: 'text', required: true, applicationPath: 'individualApplicants.{index}.firstName' },
      { fieldId: 'lastName', label: 'Last Name', type: 'text', required: true, applicationPath: 'individualApplicants.{index}.lastName' },
      { fieldId: 'ssn', label: 'SSN', type: 'ssn', required: true, applicationPath: 'individualApplicants.{index}.ssn' },
      { fieldId: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, applicationPath: 'individualApplicants.{index}.dateOfBirth' },
      { fieldId: 'address', label: 'Home Address', type: 'address', required: true, applicationPath: 'individualApplicants.{index}.address' },
      { fieldId: 'phone', label: 'Phone', type: 'phone', required: true, applicationPath: 'individualApplicants.{index}.phone' },
      { fieldId: 'email', label: 'Email', type: 'email', required: true, applicationPath: 'individualApplicants.{index}.email' },
    ],
  },
  {
    id: 'sba-eligibility',
    name: 'SBA Eligibility',
    description: 'SBA eligibility questionnaire covering criminal history, pending lawsuits, tax liens, and federal debt.',
    applicantType: 'individual',
    fields: [
      { fieldId: 'convicted', label: 'Convicted of a crime?', type: 'select', required: true, applicationPath: 'sbaEligibility.convicted' },
      { fieldId: 'arrested', label: 'Currently under arrest/indictment?', type: 'select', required: true, applicationPath: 'sbaEligibility.arrested' },
      { fieldId: 'pendingLawsuits', label: 'Pending lawsuits?', type: 'select', required: true, applicationPath: 'sbaEligibility.pendingLawsuits' },
      { fieldId: 'childSupport', label: 'Delinquent child support?', type: 'select', required: true, applicationPath: 'sbaEligibility.childSupport' },
      { fieldId: 'taxLiens', label: 'Tax liens?', type: 'select', required: true, applicationPath: 'sbaEligibility.taxLiens' },
      { fieldId: 'bankruptcy', label: 'Bankruptcy?', type: 'select', required: true, applicationPath: 'sbaEligibility.bankruptcy' },
      { fieldId: 'federalDebt', label: 'Delinquent federal debt?', type: 'select', required: true, applicationPath: 'sbaEligibility.federalDebt' },
    ],
  },
  {
    id: 'personal-financial-statement',
    name: 'Personal Financial Statement',
    description: 'SBA Form 413 — personal assets, liabilities, and net worth for each individual applicant.',
    applicantType: 'individual',
    fields: [
      { fieldId: 'firstName', label: 'First Name', type: 'text', required: true, applicationPath: 'individualApplicants.{index}.firstName' },
      { fieldId: 'lastName', label: 'Last Name', type: 'text', required: true, applicationPath: 'individualApplicants.{index}.lastName' },
      { fieldId: 'netWorth', label: 'Net Worth', type: 'currency', required: false, applicationPath: 'individualApplicants.{index}.netWorth' },
      { fieldId: 'pcLiquidity', label: 'Personal Cash / Liquidity', type: 'currency', required: false, applicationPath: 'individualApplicants.{index}.pcLiquidity' },
      { fieldId: 'creditScore', label: 'Credit Score', type: 'text', required: false, applicationPath: 'individualApplicants.{index}.creditScore' },
    ],
  },
  {
    id: 'seller-information',
    name: 'Seller Information',
    description: 'Seller details for business acquisition projects — business name, contact, and acquisition terms.',
    applicantType: 'seller',
    projectPurposes: ['Business Acquisition'],
    fields: [
      { fieldId: 'businessName', label: 'Business Name', type: 'text', required: true, section: 'Business Details', applicationPath: 'sellerInfo.businessName' },
      { fieldId: 'sellerName', label: 'Seller Name', type: 'text', required: true, section: 'Business Details', applicationPath: 'sellerInfo.sellerName' },
      { fieldId: 'sellerPhone', label: 'Phone', type: 'phone', required: false, section: 'Contact', applicationPath: 'sellerInfo.sellerPhone' },
      { fieldId: 'sellerEmail', label: 'Email', type: 'email', required: false, section: 'Contact', applicationPath: 'sellerInfo.sellerEmail' },
      { fieldId: 'sellerAddress', label: 'Address', type: 'address', required: true, section: 'Contact', applicationPath: 'sellerInfo.sellerAddress' },
      { fieldId: 'yearsInBusiness', label: 'Years in Business', type: 'number', required: false, section: 'Acquisition Details', applicationPath: 'sellerInfo.yearsInBusiness' },
      { fieldId: 'reasonForSale', label: 'Reason for Sale', type: 'textarea', required: false, section: 'Acquisition Details', applicationPath: 'sellerInfo.reasonForSale' },
      { fieldId: 'acquisitionType', label: 'Acquisition Type', type: 'select', required: false, section: 'Acquisition Details', applicationPath: 'sellerInfo.acquisitionType' },
      { fieldId: 'hasSellerCarryNote', label: 'Seller Carry Note?', type: 'select', required: false, section: 'Acquisition Details', applicationPath: 'sellerInfo.hasSellerCarryNote' },
    ],
  },
  {
    id: 'business-questionnaire',
    name: 'Business Questionnaire',
    description: 'Dynamic fillable PDF based on admin-configured questionnaire rules, filtered by project purpose and NAICS code. BDO can delete individual questions per project and regenerate.',
    applicantType: 'project',
    fields: [
      { fieldId: 'projectPurpose', label: 'Project Purpose', type: 'text', required: true, applicationPath: 'projectOverview.projectPurpose' },
      { fieldId: 'naicsCode', label: 'NAICS Code', type: 'text', required: false, applicationPath: 'businessApplicant.naicsCode' },
      { fieldId: 'businessDescription', label: 'Business Description', type: 'textarea', required: false, applicationPath: 'projectOverview.projectDescription' },
    ],
  },
];

interface FullFormField {
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  dataPath: string;
  perApplicant?: boolean;
  conditional?: string;
  bdoLabel?: string;
}

interface FullFormSection {
  sectionId: number;
  sectionName: string;
  borrowerLabel: string;
  description: string;
  perApplicant: boolean;
  conditionalOn?: string;
  fields: FullFormField[];
}

const BORROWER_FULL_FORM_SECTIONS: FullFormSection[] = [
  {
    sectionId: 3,
    sectionName: 'Business Applicant',
    borrowerLabel: 'Business Applicant',
    description: 'Business entity details, address, and ownership table. Fields are hidden if "Entity to be Formed" is checked.',
    perApplicant: false,
    fields: [
      { fieldId: 'entityToBeFormed', label: 'Entity to be Formed', type: 'checkbox', required: false, dataPath: 'businessApplicant.entityToBeFormed' },
      { fieldId: 'legalName', label: 'Legal Business Name', type: 'text', required: true, dataPath: 'businessApplicant.legalName', conditional: 'Hidden if entityToBeFormed = true' },
      { fieldId: 'dba', label: 'DBA or Trade Name', type: 'text', required: false, dataPath: 'businessApplicant.dba', conditional: 'Hidden if entityToBeFormed = true' },
      { fieldId: 'entityType', label: 'Entity Type', type: 'select', required: true, options: ['cooperative', 'corporation', 'llc', 'llp', 'partnership', 'sole-proprietor', 's-corp', 'trust'], dataPath: 'businessApplicant.entityType', conditional: 'Hidden if entityToBeFormed = true' },
      { fieldId: 'ein', label: 'Business TIN (EIN/SSN)', type: 'password', required: true, dataPath: 'businessApplicant.ein', conditional: 'Hidden if entityToBeFormed = true', bdoLabel: 'EIN' },
      { fieldId: 'yearEstablished', label: 'Year Established', type: 'select', required: true, options: ['(current year back to 1900)'], dataPath: 'businessApplicant.yearEstablished', conditional: 'Hidden if entityToBeFormed = true' },
      { fieldId: 'website', label: 'Business Website Address', type: 'url', required: false, dataPath: 'businessApplicant.website', conditional: 'Hidden if entityToBeFormed = true' },
      { fieldId: 'businessAddress', label: 'Business Address', type: 'address', required: true, dataPath: 'businessApplicant.businessAddress', conditional: 'Hidden if entityToBeFormed = true' },
      { fieldId: 'projectAddress', label: 'Project Address (if different)', type: 'address', required: false, dataPath: 'businessApplicant.projectAddress', conditional: 'Hidden if entityToBeFormed = true' },
    ],
  },
  {
    sectionId: 4,
    sectionName: 'Individual Applicants',
    borrowerLabel: 'Individual Applicants',
    description: 'Personal information, contact details, project role, and business involvement for each individual applicant/owner.',
    perApplicant: true,
    fields: [
      { fieldId: 'firstName', label: 'First Name', type: 'text', required: true, perApplicant: true, dataPath: 'individualApplicants[i].firstName' },
      { fieldId: 'middleName', label: 'Middle Name', type: 'text', required: false, perApplicant: true, dataPath: 'individualApplicants[i].middleName' },
      { fieldId: 'lastName', label: 'Last Name', type: 'text', required: true, perApplicant: true, dataPath: 'individualApplicants[i].lastName' },
      { fieldId: 'suffix', label: 'Suffix', type: 'text', required: false, perApplicant: true, dataPath: 'individualApplicants[i].suffix' },
      { fieldId: 'ssn', label: 'Social Security Number', type: 'password', required: true, perApplicant: true, dataPath: 'individualApplicants[i].ssn' },
      { fieldId: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, perApplicant: true, dataPath: 'individualApplicants[i].dateOfBirth' },
      { fieldId: 'phone', label: 'Phone', type: 'tel', required: true, perApplicant: true, dataPath: 'individualApplicants[i].phone', bdoLabel: 'Mobile Phone Number' },
      { fieldId: 'email', label: 'Email', type: 'email', required: true, perApplicant: true, dataPath: 'individualApplicants[i].email', bdoLabel: 'Email Address' },
      { fieldId: 'homeAddress', label: 'Home Address', type: 'address', required: true, perApplicant: true, dataPath: 'individualApplicants[i].homeAddress' },
      { fieldId: 'estimatedCreditScore', label: 'Estimated Credit Score', type: 'select', required: false, options: ['750+', '700-749', '650-699', '600-649', 'below-600'], perApplicant: true, dataPath: 'individualApplicants[i].estimatedCreditScore' },
      { fieldId: 'projectRole', label: 'Project Role', type: 'select', required: false, options: ['owner-guarantor', 'owner-non-guarantor', 'non-owner-key-manager', 'other'], perApplicant: true, dataPath: 'individualApplicants[i].projectRole' },
      { fieldId: 'ownershipPercentage', label: 'Ownership %', type: 'number', required: false, perApplicant: true, dataPath: 'individualApplicants[i].ownershipPercentage' },
      { fieldId: 'ownershipType', label: 'Ownership Type', type: 'select', required: false, options: ['direct', 'indirect'], perApplicant: true, dataPath: 'individualApplicants[i].ownershipType' },
      { fieldId: 'title', label: 'Title', type: 'text', required: false, perApplicant: true, dataPath: 'individualApplicants[i].title' },
      { fieldId: 'indirectOwnershipDescription', label: 'Indirect Ownership Description', type: 'textarea', required: false, perApplicant: true, dataPath: 'individualApplicants[i].indirectOwnershipDescription', conditional: 'Shown if ownershipType = "indirect"' },
      { fieldId: 'businessRole', label: 'Role in Business Operations', type: 'select', required: false, options: ['active-full-time', 'active-part-time', 'passive'], perApplicant: true, dataPath: 'individualApplicants[i].businessRole' },
      { fieldId: 'travelTime', label: 'Travel Time to Business', type: 'select', required: false, options: ['less than 30 minutes', '30 to 60 minutes', '60 to 120 minutes', 'more than 120 minutes'], perApplicant: true, dataPath: 'individualApplicants[i].travelTime' },
      { fieldId: 'experience', label: 'Relevant Experience', type: 'select', required: false, options: ['Direct', 'Transferrable', 'None'], perApplicant: true, dataPath: 'individualApplicants[i].experience' },
      { fieldId: 'yearsOfExperience', label: 'Years of Experience', type: 'select', required: false, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'More than 10'], perApplicant: true, dataPath: 'individualApplicants[i].yearsOfExperience' },
      { fieldId: 'businessRoleDescription', label: 'Describe your role and qualifications', type: 'textarea', required: false, perApplicant: true, dataPath: 'individualApplicants[i].businessRoleDescription', bdoLabel: 'Role & Qualifications Description' },
      { fieldId: 'planToBeOnSite', label: 'Plan to be On-Site', type: 'textarea', required: false, perApplicant: true, dataPath: 'individualApplicants[i].planToBeOnSite', bdoLabel: 'On-Site Plan' },
    ],
  },
  {
    sectionId: 5,
    sectionName: 'Personal Financial Statements',
    borrowerLabel: 'Personal Financial Statements (SBA 413)',
    description: 'Assets, liabilities, net worth, source of income, and detailed schedules for notes payable, stocks/bonds, real estate, and descriptive sections. Per individual applicant.',
    perApplicant: true,
    fields: [
      { fieldId: 'pfs-name', label: 'Name', type: 'text', required: true, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].name' },
      { fieldId: 'pfs-asOfDate', label: 'As of Date', type: 'date', required: true, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].asOfDate' },
      // Assets
      { fieldId: 'pfs-cashOnHand', label: 'Cash on Hand & in Banks', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.cashOnHand' },
      { fieldId: 'pfs-savingsAccounts', label: 'Savings Accounts', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.savingsAccounts' },
      { fieldId: 'pfs-iraRetirement', label: 'IRA or Other Retirement Account', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.iraRetirement' },
      { fieldId: 'pfs-accountsReceivable', label: 'Accounts & Notes Receivable', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.accountsReceivable' },
      { fieldId: 'pfs-lifeInsuranceCashValue', label: 'Life Insurance – Cash Surrender Value Only', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.lifeInsuranceCashValue' },
      { fieldId: 'pfs-stocksAndBonds', label: 'Stocks and Bonds', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.stocksAndBonds' },
      { fieldId: 'pfs-realEstate', label: 'Real Estate', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.realEstate' },
      { fieldId: 'pfs-automobiles', label: 'Automobiles', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.automobiles' },
      { fieldId: 'pfs-otherPersonalProperty', label: 'Other Personal Property', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.otherPersonalProperty' },
      { fieldId: 'pfs-otherAssets', label: 'Other Assets', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].assets.otherAssets' },
      // Liabilities
      { fieldId: 'pfs-accountsPayable', label: 'Accounts Payable', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.accountsPayable' },
      { fieldId: 'pfs-notesPayableToBanks', label: 'Notes Payable to Banks and Others', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.notesPayableToBanks' },
      { fieldId: 'pfs-installmentAccountAuto', label: 'Installment Account (Auto)', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.installmentAccountAuto' },
      { fieldId: 'pfs-installmentAccountOther', label: 'Installment Account (Other)', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.installmentAccountOther' },
      { fieldId: 'pfs-loansAgainstLifeInsurance', label: 'Loan(s) Against Life Insurance', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.loansAgainstLifeInsurance' },
      { fieldId: 'pfs-mortgagesOnRealEstate', label: 'Mortgages on Real Estate', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.mortgagesOnRealEstate' },
      { fieldId: 'pfs-unpaidTaxes', label: 'Unpaid Taxes', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.unpaidTaxes' },
      { fieldId: 'pfs-otherLiabilities', label: 'Other Liabilities', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].liabilities.otherLiabilities' },
      // Source of Income
      { fieldId: 'pfs-salary', label: 'Salary', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].income.salary' },
      { fieldId: 'pfs-netInvestmentIncome', label: 'Net Investment Income', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].income.netInvestmentIncome' },
      { fieldId: 'pfs-realEstateIncome', label: 'Real Estate Income', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].income.realEstateIncome' },
      { fieldId: 'pfs-otherIncome', label: 'Other Income', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].income.otherIncome' },
      // Contingent Liabilities
      { fieldId: 'pfs-contingent-endorser', label: 'As Endorser/Co-Maker', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].contingent.asEndorserOrCoMaker' },
      { fieldId: 'pfs-contingent-legalClaims', label: 'Legal Claims & Judgments', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].contingent.legalClaimsJudgments' },
      { fieldId: 'pfs-contingent-federalTax', label: 'Federal Income Tax', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].contingent.provisionFederalIncomeTax' },
      { fieldId: 'pfs-contingent-otherDebt', label: 'Other Special Debt', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].contingent.otherSpecialDebt' },
      // Notes Payable schedule
      { fieldId: 'pfs-noteNoteholder', label: 'Noteholder', type: 'text', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].notesPayable[].noteholder' },
      { fieldId: 'pfs-noteOrigBal', label: 'Original Balance', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].notesPayable[].originalBalance' },
      { fieldId: 'pfs-noteCurrBal', label: 'Current Balance', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].notesPayable[].currentBalance' },
      { fieldId: 'pfs-notePayment', label: 'Payment Amount', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].notesPayable[].paymentAmount' },
      { fieldId: 'pfs-noteFrequency', label: 'Payment Frequency', type: 'select', required: false, options: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'annually'], perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].notesPayable[].frequency' },
      { fieldId: 'pfs-noteCollateral', label: 'Collateral', type: 'text', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].notesPayable[].collateral' },
      // Securities schedule
      { fieldId: 'pfs-secShares', label: 'Number of Shares', type: 'number', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].securities[].numberOfShares' },
      { fieldId: 'pfs-secName', label: 'Name of Securities', type: 'text', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].securities[].nameOfSecurities' },
      { fieldId: 'pfs-secCost', label: 'Cost', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].securities[].cost' },
      { fieldId: 'pfs-secMarketValue', label: 'Market Value', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].securities[].marketValue' },
      { fieldId: 'pfs-secDate', label: 'Date of Quotation', type: 'date', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].securities[].dateOfQuotation' },
      { fieldId: 'pfs-secTotal', label: 'Total Value', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].securities[].totalValue' },
      // Real Estate schedule
      { fieldId: 'pfs-reType', label: 'Property Type', type: 'select', required: false, options: ['primary_residence', 'other_residence', 'rental_property', 'land', 'commercial'], perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].type' },
      { fieldId: 'pfs-reAddress', label: 'Property Address', type: 'text', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].address' },
      { fieldId: 'pfs-reDatePurchased', label: 'Date Purchased', type: 'date', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].datePurchased' },
      { fieldId: 'pfs-reOrigCost', label: 'Original Cost', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].originalCost' },
      { fieldId: 'pfs-reMarketValue', label: 'Present Market Value', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].presentMarketValue' },
      { fieldId: 'pfs-reMortgageHolder', label: 'Mortgage Holder', type: 'text', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].mortgageHolder' },
      { fieldId: 'pfs-reMortgageAcct', label: 'Mortgage Account Number', type: 'text', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].mortgageAccountNumber' },
      { fieldId: 'pfs-reMortgageBal', label: 'Mortgage Balance', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].mortgageBalance' },
      { fieldId: 'pfs-reMonthlyPayment', label: 'Monthly Payment', type: 'currency', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].monthlyPayment' },
      { fieldId: 'pfs-reStatus', label: 'Status', type: 'select', required: false, options: ['current', 'delinquent', 'paid_off'], perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].realEstateOwned[].status' },
      // Descriptive sections
      { fieldId: 'pfs-otherPropertyDesc', label: 'Other Personal Property & Assets Description', type: 'textarea', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].otherPersonalPropertyDescription' },
      { fieldId: 'pfs-unpaidTaxesDesc', label: 'Unpaid Taxes Description', type: 'textarea', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].unpaidTaxesDescription' },
      { fieldId: 'pfs-otherLiabilitiesDesc', label: 'Other Liabilities Description', type: 'textarea', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].otherLiabilitiesDescription' },
      { fieldId: 'pfs-lifeInsuranceDesc', label: 'Life Insurance Held Description', type: 'textarea', required: false, perApplicant: true, dataPath: 'personalFinancialStatements[applicantId].lifeInsuranceDescription' },
    ],
  },
  {
    sectionId: 6,
    sectionName: 'Other Owned Businesses',
    borrowerLabel: 'Other Owned Businesses',
    description: 'Discloses ownership, control, or financial involvement in other businesses by any owner of the applicant business.',
    perApplicant: false,
    fields: [
      { fieldId: 'hasOtherBusinesses', label: 'Do you or any owner have ownership in other businesses?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'otherOwnedBusinesses.hasOtherBusinesses' },
      { fieldId: 'businessName', label: 'Business Name', type: 'text', required: false, dataPath: 'otherOwnedBusinesses.businesses[].businessName', conditional: 'Shown if hasOtherBusinesses = "yes"' },
      { fieldId: 'ownerName', label: 'Owner Name', type: 'select', required: false, options: ['(populated from individual applicants)'], dataPath: 'otherOwnedBusinesses.businesses[].ownershipPercentages[].ownerName', conditional: 'Shown if hasOtherBusinesses = "yes"' },
      { fieldId: 'ownershipPct', label: 'Ownership %', type: 'number', required: false, dataPath: 'otherOwnedBusinesses.businesses[].ownershipPercentages[].percentage', conditional: 'Shown if hasOtherBusinesses = "yes"' },
      { fieldId: 'roleInBusiness', label: 'Role in Business', type: 'select', required: false, options: ['active-full-time', 'active-part-time', 'passive'], dataPath: 'otherOwnedBusinesses.businesses[].ownershipPercentages[].roleInBusiness', conditional: 'Shown if hasOtherBusinesses = "yes"' },
      { fieldId: 'industry', label: 'Industry', type: 'text', required: false, dataPath: 'otherOwnedBusinesses.businesses[].industry', conditional: 'Shown if hasOtherBusinesses = "yes"' },
    ],
  },
  {
    sectionId: 7,
    sectionName: 'SBA Eligibility',
    borrowerLabel: 'SBA Eligibility',
    description: 'Seven yes/no eligibility questions with conditional explanation text areas. Each "yes" answer requires a detailed explanation.',
    perApplicant: false,
    fields: [
      { fieldId: 'convicted', label: 'Have any applicants been convicted of a criminal offense?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.convicted' },
      { fieldId: 'convictedExplanation', label: 'Conviction Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.convictedExplanation', conditional: 'Shown if convicted = "yes"' },
      { fieldId: 'arrested', label: 'Currently under indictment or criminal charge?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.arrested' },
      { fieldId: 'arrestedExplanation', label: 'Arrest/Indictment Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.arrestedExplanation', conditional: 'Shown if arrested = "yes"' },
      { fieldId: 'pendingLawsuits', label: 'Parties to any pending lawsuits?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.pendingLawsuits' },
      { fieldId: 'pendingLawsuitsExplanation', label: 'Pending Lawsuits Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.pendingLawsuitsExplanation', conditional: 'Shown if pendingLawsuits = "yes"' },
      { fieldId: 'childSupport', label: 'Delinquent on child support obligations?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.childSupport' },
      { fieldId: 'childSupportExplanation', label: 'Child Support Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.childSupportExplanation', conditional: 'Shown if childSupport = "yes"' },
      { fieldId: 'taxLiens', label: 'Subject to any tax liens?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.taxLiens' },
      { fieldId: 'taxLiensExplanation', label: 'Tax Liens Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.taxLiensExplanation', conditional: 'Shown if taxLiens = "yes"' },
      { fieldId: 'bankruptcy', label: 'Involved in a bankruptcy proceeding?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.bankruptcy' },
      { fieldId: 'bankruptcyExplanation', label: 'Bankruptcy Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.bankruptcyExplanation', conditional: 'Shown if bankruptcy = "yes"' },
      { fieldId: 'federalDebt', label: 'Delinquent on any federal debt?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sbaEligibility.federalDebt' },
      { fieldId: 'federalDebtExplanation', label: 'Federal Debt Explanation', type: 'textarea', required: false, dataPath: 'sbaEligibility.federalDebtExplanation', conditional: 'Shown if federalDebt = "yes"' },
    ],
  },
  {
    sectionId: 8,
    sectionName: 'Project Information',
    borrowerLabel: 'Project Information (Seller Info)',
    description: 'Business acquisition details including seller contact, acquisition type, contract status, seller carry note, and document uploads.',
    perApplicant: false,
    conditionalOn: 'Project purpose includes "Business Acquisition"',
    fields: [
      { fieldId: 'legalName', label: 'Legal Name of Business Being Acquired', type: 'text', required: true, dataPath: 'sellerInfo.legalName', bdoLabel: 'Seller Legal Name' },
      { fieldId: 'dbaName', label: 'DBA Name', type: 'text', required: false, dataPath: 'sellerInfo.dbaName' },
      { fieldId: 'address', label: 'Business Address', type: 'address', required: true, dataPath: 'sellerInfo.address' },
      { fieldId: 'website', label: 'Business Website', type: 'url', required: false, dataPath: 'sellerInfo.website' },
      { fieldId: 'acquisitionType', label: 'Type of Acquisition', type: 'radio', required: false, options: ['stock', 'asset'], dataPath: 'sellerInfo.acquisitionType' },
      { fieldId: 'isPurchasing100Percent', label: 'Purchasing 100% of the business?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sellerInfo.isPurchasing100Percent', bdoLabel: '100% Purchase?' },
      { fieldId: 'otherOwnersDescription', label: 'Other owners post-acquisition', type: 'textarea', required: false, dataPath: 'sellerInfo.otherOwnersDescription', conditional: 'Shown if isPurchasing100Percent = "no"' },
      { fieldId: 'contractStatus', label: 'Purchase Contract Status', type: 'select', required: false, options: ['No LOI or contract yet', 'LOI signed', 'Contract under negotiation', 'Contract signed', 'In due diligence'], dataPath: 'sellerInfo.contractStatus' },
      { fieldId: 'hasSellerCarryNote', label: 'Will the seller carry a note?', type: 'radio', required: false, options: ['yes', 'no'], dataPath: 'sellerInfo.hasSellerCarryNote', bdoLabel: 'Seller Carry Note?' },
      { fieldId: 'sellerCarryNoteTerms', label: 'Seller carry note terms', type: 'textarea', required: false, dataPath: 'sellerInfo.sellerCarryNoteTerms', conditional: 'Shown if hasSellerCarryNote = "yes"' },
      { fieldId: 'businessDescription', label: 'Business Description', type: 'textarea', required: false, dataPath: 'sellerInfo.businessDescription' },
      { fieldId: 'realEstatePurchaseDescription', label: 'Real Estate Purchase Description', type: 'textarea', required: false, dataPath: 'sellerInfo.realEstatePurchaseDescription' },
      { fieldId: 'loiContract', label: 'LOI / Purchase Contract', type: 'file', required: false, dataPath: 'sellerInfo.loiContractIds' },
      { fieldId: 'taxReturns', label: 'Business Federal Tax Returns (3 years)', type: 'file', required: false, dataPath: 'sellerInfo.taxReturnIds' },
      { fieldId: 'otherFiles', label: 'Other Files', type: 'file', required: false, dataPath: 'sellerInfo.otherDocumentIds' },
    ],
  },
  {
    sectionId: 9,
    sectionName: 'File Uploads',
    borrowerLabel: 'File Uploads',
    description: 'Document uploads organized by category — business applicant files, individual applicant files, other business files, and project files.',
    perApplicant: false,
    fields: [
      { fieldId: 'businessTaxReturns', label: 'Business Tax Returns', type: 'file', required: false, dataPath: 'files.businessApplicant.taxReturns' },
      { fieldId: 'businessFinancials', label: 'Business Financial Statements', type: 'file', required: false, dataPath: 'files.businessApplicant.financials' },
      { fieldId: 'individualTaxReturns', label: 'Individual Tax Returns', type: 'file', required: false, perApplicant: true, dataPath: 'files.individualApplicants[i].taxReturns' },
      { fieldId: 'individualFinancials', label: 'Individual Financial Statements', type: 'file', required: false, perApplicant: true, dataPath: 'files.individualApplicants[i].financials' },
      { fieldId: 'individualResumes', label: 'Resumes', type: 'file', required: false, perApplicant: true, dataPath: 'files.individualApplicants[i].resumes' },
      { fieldId: 'projectFiles', label: 'Project Files', type: 'file', required: false, dataPath: 'files.project' },
    ],
  },
  {
    sectionId: 10,
    sectionName: 'Business Questionnaire',
    borrowerLabel: 'Business Questionnaire',
    description: 'Dynamic questionnaire generated based on project purpose, NAICS code, and admin-configured rules. Opens in a separate page. BDO can delete/regenerate questions per project.',
    perApplicant: false,
    fields: [
      { fieldId: 'dynamicQuestions', label: 'Dynamic Questions (admin-configured)', type: 'dynamic', required: false, dataPath: 'questionnaire.responses[]' },
    ],
  },
  {
    sectionId: 11,
    sectionName: 'Review & Submit',
    borrowerLabel: 'Review & Submit',
    description: 'Final review of all entered data with validation summary. Borrower confirms accuracy and submits the application.',
    perApplicant: false,
    fields: [
      { fieldId: 'confirmAccuracy', label: 'I confirm all information is accurate', type: 'checkbox', required: true, dataPath: 'submission.confirmed' },
      { fieldId: 'submissionDate', label: 'Submission Date', type: 'date', required: false, dataPath: 'submission.submittedAt' },
    ],
  },
];

const emptyRuleForm: Omit<QuestionnaireRule, 'id'> = {
  name: '',
  enabled: true,
  order: 0,
  blockType: 'question',
  mainCategory: 'Business Overview',
  questionText: '',
  aiBlockTemplateId: '',
  purposeKey: '',
  naicsCodes: [],
  questionOrder: 0,
};

const emptyTemplateForm: Omit<AIBlockTemplate, 'id'> = {
  name: '',
  description: '',
  prompt: '',
  inputFields: [],
};

const emptyProjectTypeRuleForm: Omit<ProjectTypeRule, 'id'> = {
  name: '',
  description: '',
  riskLevel: 'medium',
  isFallback: false,
  priority: 0,
  isStartup: 'any',
  hasExistingCashflow: 'any',
  hasTransitionRisk: 'any',
  includesRealEstate: 'any',
  creScope: 'any',
  isPartnerBuyout: 'any',
  involvesConstruction: 'any',
  includesDebtRefinance: 'any',
  debtRefinancePrimary: 'any',
};

const emptyFeeConfigurationForm: Omit<FeeConfiguration, 'id'> = {
  feeName: 'Good Faith Deposit',
  amount: 0,
  includesRealEstate: false,
  description: '',
  active: true,
};

const FEE_NAME_OPTIONS: FeeNameType[] = [
  'Good Faith Deposit',
  'SBA Guarantee Fee',
  'Packaging Fee',
  'Appraisal Fee',
  'Environmental Fee',
  'Title Insurance',
  'Legal Fees',
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { userInfo, isLoading } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState('default-values');
  const [settings, setSettings] = useState<AdminSettings>({
    aiPrompts: [
      {
        id: 'naics-suggestion',
        name: 'NAICS Code Suggestion',
        prompt: `Based on the industry "{industry}", suggest the top 3 most appropriate NAICS codes (6-digit codes).

Return a JSON object with a "suggestions" array containing exactly 3 objects, each with:
- code: the 6-digit NAICS code (as a string)
- title: the official NAICS title
- description: a brief explanation of why this code is appropriate for this industry

Example format:
{
  "suggestions": [
    {
      "code": "722511",
      "title": "Full-Service Restaurants",
      "description": "Fits businesses providing food services with wait staff"
    }
  ]
}`,
        description: 'System prompt for generating NAICS code suggestions',
      },
    ],
    questionnaireRules: [],
    aiBlockTemplates: [],
    noteTags: [],
    defaultValues: {
      wsjPrimeRate: null,
      dscrPeriod1: '',
      dscrPeriod2: '',
      dscrPeriod3: '',
      dscrPeriod4: '',
    },
    projectTypeRules: [],
    feeConfigurations: [],
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [appUsers, setAppUsers] = useState<AppUser[]>(TEST_USERS);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Questionnaire Rules table state
  const [rulesCategoryFilter, setRulesCategoryFilter] = useState<string>('All');
  const [rulesSortField, setRulesSortField] = useState<string>('questionOrder');
  const [rulesSortDir, setRulesSortDir] = useState<'asc' | 'desc'>('asc');

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Theme settings from global context
  const { themeSettings, setThemeSettings, saveTheme, resetTheme } = useTheme();

  // Add User Modal State
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'BDO' as string,
  });

  // Questionnaire Rules Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QuestionnaireRule | null>(null);
  const [ruleForm, setRuleForm] = useState<Omit<QuestionnaireRule, 'id'>>(emptyRuleForm);

  // Questionnaire Rules Import Modal State
  const [importRulesModalOpen, setImportRulesModalOpen] = useState(false);
  const [importRulesJson, setImportRulesJson] = useState('');
  const [importRulesMode, setImportRulesMode] = useState<'replace' | 'merge'>('merge');
  const [importRulesError, setImportRulesError] = useState<string | null>(null);

  // AI Block Templates Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AIBlockTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<Omit<AIBlockTemplate, 'id'>>(emptyTemplateForm);

  // Project Type Rules Modal State
  const [projectTypeRuleModalOpen, setProjectTypeRuleModalOpen] = useState(false);
  const [editingProjectTypeRule, setEditingProjectTypeRule] = useState<ProjectTypeRule | null>(null);
  const [projectTypeRuleForm, setProjectTypeRuleForm] = useState<Omit<ProjectTypeRule, 'id'>>(emptyProjectTypeRuleForm);

  // Fee Configuration Modal State
  const [feeConfigModalOpen, setFeeConfigModalOpen] = useState(false);
  const [editingFeeConfig, setEditingFeeConfig] = useState<FeeConfiguration | null>(null);
  const [feeConfigForm, setFeeConfigForm] = useState<Omit<FeeConfiguration, 'id'>>(emptyFeeConfigurationForm);

  useEffect(() => {
    // Check if user is Admin
    if (!isLoading && userInfo) {
      if (userInfo.role !== 'Admin') {
        router.push('/bdo/projects');
      }
    }
  }, [userInfo, isLoading, router]);

  const loadAppUsers = () => {
    // No-op: users are managed in local state
  };

  const deleteAppUser = (uid: string, email: string | null) => {
    // Prevent deleting yourself
    if (uid === userInfo?.uid) {
      alert('You cannot delete your own account.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the user "${email || 'Unknown'}"?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setIsDeletingUser(uid);
    setAppUsers((prev) => prev.filter((u) => u.uid !== uid));
    setIsDeletingUser(null);
    alert('User deleted successfully!');
  };

  const handleAddUser = () => {
    if (!newUserForm.email || !newUserForm.role) {
      alert('Email and Role are required.');
      return;
    }

    setIsAddingUser(true);

    // Create a unique ID for the new user
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create display name from first and last name
    const displayName = [newUserForm.firstName, newUserForm.lastName]
      .filter(Boolean)
      .join(' ') || null;

    const newUser: AppUser = {
      uid: newUserId,
      email: newUserForm.email,
      role: newUserForm.role,
      displayName,
      createdAt: new Date(),
    };

    setAppUsers((prev) => [newUser, ...prev]);

    // Reset form and close modal
    setNewUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'BDO',
    });
    setAddUserModalOpen(false);
    setIsAddingUser(false);

    alert('User added successfully!');
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Persist theme to localStorage and apply CSS variables globally
      saveTheme();
      await saveAdminSettings(settings);
      setHasUnsavedChanges(false);
      alert('Settings saved successfully!');
    } catch (err: any) {
      console.error('Error saving admin settings:', err);
      alert(`Failed to save settings: ${err.message ?? err}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingSettings(true);
      try {
        const loaded = await getAdminSettings<typeof settings>();
        if (!cancelled && loaded) {
          setSettings((prev) => ({ ...prev, ...loaded }));
        }
      } catch (err) {
        console.error('Error loading admin settings:', err);
      } finally {
        if (!cancelled) setIsLoadingSettings(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // AI Prompts handlers
  const addAIPrompt = () => {
    const newPrompt: AIPrompt = {
      id: `prompt-${Date.now()}`,
      name: 'New Prompt',
      prompt: '',
      description: '',
    };
    setSettings({
      ...settings,
      aiPrompts: [...settings.aiPrompts, newPrompt],
    });
    setHasUnsavedChanges(true);
  };

  const updateAIPrompt = (id: string, updates: Partial<AIPrompt>) => {
    setSettings({
      ...settings,
      aiPrompts: settings.aiPrompts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
    setHasUnsavedChanges(true);
  };

  const deleteAIPrompt = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      setSettings({
        ...settings,
        aiPrompts: settings.aiPrompts.filter((p) => p.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  // Questionnaire Rules handlers
  const openRuleModal = (rule?: QuestionnaireRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        name: rule.name,
        enabled: rule.enabled,
        order: rule.order,
        blockType: rule.blockType,
        mainCategory: rule.mainCategory || 'Business Overview',
        questionText: rule.questionText || '',
        aiBlockTemplateId: rule.aiBlockTemplateId || '',
        purposeKey: rule.purposeKey || '',
        naicsCodes: rule.naicsCodes || [],
        questionOrder: rule.questionOrder || 0,
      });
    } else {
      setEditingRule(null);
      setRuleForm(emptyRuleForm);
    }
    setRuleModalOpen(true);
  };

  const handleRuleSubmit = () => {
    if (!ruleForm.name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (!ruleForm.mainCategory) {
      alert('Please select a main category');
      return;
    }

    if (ruleForm.blockType === 'question' && !ruleForm.questionText?.trim()) {
      alert('Please enter question text');
      return;
    }

    if (ruleForm.blockType === 'ai-generated' && !ruleForm.aiBlockTemplateId) {
      alert('Please select an AI template');
      return;
    }

    if (editingRule) {
      // Update existing rule
      setSettings({
        ...settings,
        questionnaireRules: settings.questionnaireRules.map((r) =>
          r.id === editingRule.id ? { ...ruleForm, id: editingRule.id } : r
        ),
      });
    } else {
      // Create new rule
      const newRule: QuestionnaireRule = {
        ...ruleForm,
        id: `rule-${Date.now()}`,
      };
      setSettings({
        ...settings,
        questionnaireRules: [...settings.questionnaireRules, newRule],
      });
    }

    setHasUnsavedChanges(true);
    setRuleModalOpen(false);
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
  };

  const handleImportQuestionnaireRules = () => {
    setImportRulesError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(importRulesJson);
    } catch (e: any) {
      setImportRulesError(`Invalid JSON: ${e.message}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setImportRulesError('Expected a JSON array of rules.');
      return;
    }

    const validCategories = ['Business Overview', 'Project Purpose', 'Industry'];
    const imported: QuestionnaireRule[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const raw = parsed[i];
      if (!raw || typeof raw !== 'object') {
        setImportRulesError(`Item ${i} is not an object.`);
        return;
      }
      const mainCategory = raw.main_category ?? raw.mainCategory;
      if (!validCategories.includes(mainCategory)) {
        setImportRulesError(`Item ${i} (${raw.name ?? raw.id}) has invalid main_category: ${mainCategory}`);
        return;
      }
      const blockType = raw.block_type ?? raw.blockType ?? 'question';
      if (blockType !== 'question' && blockType !== 'ai-generated') {
        setImportRulesError(`Item ${i} (${raw.name ?? raw.id}) has invalid block_type: ${blockType}`);
        return;
      }
      const purposeKeys: string[] = Array.isArray(raw.purpose_keys ?? raw.purposeKeys)
        ? (raw.purpose_keys ?? raw.purposeKeys)
        : [];
      const singleKey: string = raw.purpose_key ?? raw.purposeKey ?? '';
      imported.push({
        id: String(raw.id ?? `rule-${Date.now()}-${i}`),
        name: String(raw.name ?? ''),
        enabled: raw.enabled !== false,
        order: Number(raw.order ?? 0),
        blockType,
        mainCategory,
        questionText: raw.question_text ?? raw.questionText ?? '',
        aiBlockTemplateId: raw.ai_block_template_id ?? raw.aiBlockTemplateId ?? '',
        purposeKey: singleKey || purposeKeys[0] || '',
        purposeKeys: purposeKeys.length > 0 ? purposeKeys : (singleKey ? [singleKey] : []),
        excludePurposes: Array.isArray(raw.exclude_purposes ?? raw.excludePurposes)
          ? (raw.exclude_purposes ?? raw.excludePurposes)
          : [],
        alwaysShow: Boolean(raw.always_show ?? raw.alwaysShow ?? false),
        naicsCodes: Array.isArray(raw.naics_codes ?? raw.naicsCodes)
          ? (raw.naics_codes ?? raw.naicsCodes)
          : [],
        questionOrder: Number(raw.question_order ?? raw.questionOrder ?? 0),
      });
    }

    let nextRules: QuestionnaireRule[];
    if (importRulesMode === 'replace') {
      nextRules = imported;
    } else {
      const byId = new Map<string, QuestionnaireRule>();
      for (const r of settings.questionnaireRules) byId.set(r.id, r);
      for (const r of imported) byId.set(r.id, r);
      nextRules = Array.from(byId.values());
    }

    setSettings({ ...settings, questionnaireRules: nextRules });
    setHasUnsavedChanges(true);
    setImportRulesModalOpen(false);
    setImportRulesJson('');
    setImportRulesError(null);
    alert(`Imported ${imported.length} rule(s). Remember to save settings.`);
  };

  const deleteQuestionnaireRule = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setSettings({
        ...settings,
        questionnaireRules: settings.questionnaireRules.filter((r) => r.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };


  // AI Block Templates handlers
  const openTemplateModal = (template?: AIBlockTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        description: template.description,
        prompt: template.prompt,
        inputFields: template.inputFields,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm(emptyTemplateForm);
    }
    setTemplateModalOpen(true);
  };

  const handleTemplateSubmit = () => {
    if (!templateForm.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (!templateForm.description.trim()) {
      alert('Please enter a template description');
      return;
    }

    if (!templateForm.prompt.trim()) {
      alert('Please enter a prompt template');
      return;
    }

    if (editingTemplate) {
      // Update existing template
      setSettings({
        ...settings,
        aiBlockTemplates: settings.aiBlockTemplates.map((t) =>
          t.id === editingTemplate.id ? { ...templateForm, id: editingTemplate.id } : t
        ),
      });
    } else {
      // Create new template
      const newTemplate: AIBlockTemplate = {
        ...templateForm,
        id: `template-${Date.now()}`,
      };
      setSettings({
        ...settings,
        aiBlockTemplates: [...settings.aiBlockTemplates, newTemplate],
      });
    }

    setHasUnsavedChanges(true);
    setTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
  };

  const deleteAIBlockTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setSettings({
        ...settings,
        aiBlockTemplates: settings.aiBlockTemplates.filter((t) => t.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  const addInputField = () => {
    setTemplateForm({
      ...templateForm,
      inputFields: [
        ...templateForm.inputFields,
        { name: '', label: '', type: 'text', placeholder: '', required: false },
      ],
    });
  };

  const updateInputField = (index: number, updates: Partial<AIBlockTemplate['inputFields'][0]>) => {
    const newFields = [...templateForm.inputFields];
    newFields[index] = { ...newFields[index], ...updates };
    setTemplateForm({ ...templateForm, inputFields: newFields });
  };

  const removeInputField = (index: number) => {
    setTemplateForm({
      ...templateForm,
      inputFields: templateForm.inputFields.filter((_, i) => i !== index),
    });
  };

  // Note Tags handlers
  const addNoteTag = () => {
    const trimmedTag = newTagInput.trim();
    if (!trimmedTag) {
      alert('Please enter a tag name');
      return;
    }
    if (settings.noteTags.includes(trimmedTag)) {
      alert('This tag already exists');
      return;
    }
    setSettings({
      ...settings,
      noteTags: [...settings.noteTags, trimmedTag],
    });
    setNewTagInput('');
    setHasUnsavedChanges(true);
  };

  const deleteNoteTag = (tagToDelete: string) => {
    if (confirm(`Are you sure you want to delete the tag "${tagToDelete}"?`)) {
      setSettings({
        ...settings,
        noteTags: settings.noteTags.filter((tag) => tag !== tagToDelete),
      });
      setHasUnsavedChanges(true);
    }
  };

  // Project Type Rules handlers
  const openProjectTypeRuleModal = (rule?: ProjectTypeRule) => {
    if (rule) {
      setEditingProjectTypeRule(rule);
      setProjectTypeRuleForm({
        name: rule.name,
        description: rule.description || '',
        riskLevel: rule.riskLevel,
        isFallback: rule.isFallback,
        priority: rule.priority ?? ((rule as unknown as {order?: number}).order) ?? 0,
        isStartup: rule.isStartup,
        hasExistingCashflow: rule.hasExistingCashflow,
        hasTransitionRisk: rule.hasTransitionRisk,
        includesRealEstate: rule.includesRealEstate,
        creScope: rule.creScope,
        isPartnerBuyout: rule.isPartnerBuyout,
        involvesConstruction: rule.involvesConstruction,
        includesDebtRefinance: rule.includesDebtRefinance ?? 'any',
        debtRefinancePrimary: rule.debtRefinancePrimary ?? 'any',
      });
    } else {
      setEditingProjectTypeRule(null);
      const nextPriority = settings.projectTypeRules.length > 0
        ? Math.max(...settings.projectTypeRules.map(r => r.priority ?? ((r as unknown as {order?: number}).order) ?? 0)) + 1
        : 1;
      setProjectTypeRuleForm({ ...emptyProjectTypeRuleForm, priority: nextPriority });
    }
    setProjectTypeRuleModalOpen(true);
  };

  const handleProjectTypeRuleSubmit = () => {
    if (!projectTypeRuleForm.name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (editingProjectTypeRule) {
      // Update existing rule
      setSettings({
        ...settings,
        projectTypeRules: settings.projectTypeRules.map((r) =>
          r.id === editingProjectTypeRule.id ? { ...projectTypeRuleForm, id: editingProjectTypeRule.id } : r
        ),
      });
    } else {
      // Create new rule
      const newRule: ProjectTypeRule = {
        ...projectTypeRuleForm,
        id: `project-type-rule-${Date.now()}`,
      };
      setSettings({
        ...settings,
        projectTypeRules: [...settings.projectTypeRules, newRule],
      });
    }

    setHasUnsavedChanges(true);
    setProjectTypeRuleModalOpen(false);
    setEditingProjectTypeRule(null);
    setProjectTypeRuleForm(emptyProjectTypeRuleForm);
  };

  const deleteProjectTypeRule = (id: string) => {
    if (confirm('Are you sure you want to delete this project type rule?')) {
      setSettings({
        ...settings,
        projectTypeRules: settings.projectTypeRules.filter((r) => r.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleImportRiskAssessmentRules = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (!Array.isArray(imported)) {
          alert('Invalid file format. Expected a JSON array of rules.');
          return;
        }

        // Convert string yes/no to boolean TriStateCondition
        const convertCondition = (val: string | boolean | undefined): TriStateCondition => {
          if (val === 'yes' || val === true) return true;
          if (val === 'no' || val === false) return false;
          return 'any';
        };

        const convertCreScope = (val: string | undefined): CREScope => {
          if (val === 'purchase') return 'purchase';
          if (val === 'improvement') return 'improvement';
          return 'any';
        };

        const existingIds = new Set(settings.projectTypeRules.map(r => r.id));
        const existingNames = new Set(settings.projectTypeRules.map(r => r.name.toLowerCase()));

        const newRules: ProjectTypeRule[] = [];
        let skipped = 0;

        for (let i = 0; i < imported.length; i++) {
          const raw = imported[i];

          // Skip duplicates by id or name
          if (existingIds.has(raw.id) || existingNames.has((raw.name || '').toLowerCase())) {
            skipped++;
            continue;
          }

          const basePriority = settings.projectTypeRules.length > 0
            ? Math.max(...settings.projectTypeRules.map(r => r.priority ?? 0)) + 1
            : 1;

          newRules.push({
            id: raw.id || `imported-rule-${Date.now()}-${i}`,
            name: raw.name || `Imported Rule ${i + 1}`,
            description: raw.description || '',
            riskLevel: raw.riskLevel || 'medium',
            isFallback: raw.isFallback ?? false,
            priority: raw.priority ?? (basePriority + i),
            isStartup: convertCondition(raw.isStartup),
            hasExistingCashflow: convertCondition(raw.hasExistingCashflow),
            hasTransitionRisk: convertCondition(raw.hasTransitionRisk),
            includesRealEstate: convertCondition(raw.includesRealEstate),
            creScope: convertCreScope(raw.creScope),
            isPartnerBuyout: convertCondition(raw.isPartnerBuyout),
            involvesConstruction: convertCondition(raw.involvesConstruction),
            includesDebtRefinance: convertCondition(raw.includesDebtRefinance),
            debtRefinancePrimary: convertCondition(raw.debtRefinancePrimary),
          });
        }

        if (newRules.length === 0) {
          alert(`No new rules to import. ${skipped > 0 ? `${skipped} rule(s) already exist.` : ''}`);
          return;
        }

        const msg = skipped > 0
          ? `Import ${newRules.length} new rule(s)? (${skipped} duplicate(s) will be skipped)`
          : `Import ${newRules.length} rule(s)?`;

        if (!confirm(msg + '\n\nDon\'t forget to save after importing.')) return;

        setSettings({
          ...settings,
          projectTypeRules: [...settings.projectTypeRules, ...newRules],
        });
        setHasUnsavedChanges(true);
        alert(`Successfully imported ${newRules.length} rule(s). Don't forget to save your changes.`);
      } catch (err: any) {
        console.error('Error importing rules:', err);
        alert('Error reading file: ' + err.message);
      }
    };
    input.click();
  };

  // Fee Configuration handlers
  const openFeeConfigModal = (feeConfig?: FeeConfiguration) => {
    if (feeConfig) {
      setEditingFeeConfig(feeConfig);
      setFeeConfigForm({
        feeName: feeConfig.feeName,
        amount: feeConfig.amount,
        includesRealEstate: feeConfig.includesRealEstate,
        description: feeConfig.description,
        active: feeConfig.active,
      });
    } else {
      setEditingFeeConfig(null);
      setFeeConfigForm(emptyFeeConfigurationForm);
    }
    setFeeConfigModalOpen(true);
  };

  const handleFeeConfigSubmit = () => {
    if (!feeConfigForm.feeName) {
      alert('Please select a fee name');
      return;
    }
    if (feeConfigForm.amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    if (editingFeeConfig) {
      // Update existing fee configuration
      setSettings({
        ...settings,
        feeConfigurations: (settings.feeConfigurations || []).map((fc) =>
          fc.id === editingFeeConfig.id ? { ...feeConfigForm, id: editingFeeConfig.id } : fc
        ),
      });
    } else {
      // Create new fee configuration
      const newFeeConfig: FeeConfiguration = {
        ...feeConfigForm,
        id: `fee-config-${Date.now()}`,
      };
      setSettings({
        ...settings,
        feeConfigurations: [...(settings.feeConfigurations || []), newFeeConfig],
      });
    }

    setHasUnsavedChanges(true);
    setFeeConfigModalOpen(false);
    setEditingFeeConfig(null);
    setFeeConfigForm(emptyFeeConfigurationForm);
  };

  const deleteFeeConfig = (id: string) => {
    if (confirm('Are you sure you want to delete this fee configuration?')) {
      setSettings({
        ...settings,
        feeConfigurations: (settings.feeConfigurations || []).filter((fc) => fc.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  // Helper function for condition badges
  const getConditionBadge = (condition: TriStateCondition | CREScope, label: string) => {
    if (condition === 'any') return null;
    const isYes = condition === true || condition === 'purchase' || condition === 'improvement';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isYes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {label}: {typeof condition === 'boolean' ? (condition ? 'Yes' : 'No') : condition}
      </span>
    );
  };

  if (isLoading || isLoadingSettings) {
    return (
      <BDOLayout title="Admin Settings">
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--t-color-accent)] border-t-transparent rounded-full"></div>
            <p className="text-[color:var(--t-color-text-muted)] mt-4">Loading admin settings...</p>
          </div>
        </div>
      </BDOLayout>
    );
  }

  if (userInfo?.role !== 'Admin') {
    return null;
  }

  return (
    <BDOLayout title="Admin Settings">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--t-color-primary)] mb-1" data-testid="text-admin-title">
            Admin Settings
          </h1>
          <p className="text-sm text-[color:var(--t-color-text-secondary)]">
            Configure default inputs, AI prompts, questionnaire rules, and AI block templates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                !isSaving
                  ? 'bg-[var(--t-color-primary)] text-white hover-elevate active-elevate-2'
                  : 'bg-[var(--t-color-border)] text-[color:var(--t-color-text-muted)] cursor-not-allowed'
              }`}
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="default-values" data-testid="tab-default-inputs">Default Inputs</TabsTrigger>
          <TabsTrigger value="ai-prompts" data-testid="tab-ai-prompts">AI Prompts</TabsTrigger>
          <TabsTrigger value="questionnaire-rules" data-testid="tab-questionnaire-rules">Questionnaire Rules</TabsTrigger>
          <TabsTrigger value="ai-block-templates" data-testid="tab-ai-templates">AI Block Templates</TabsTrigger>
          <TabsTrigger value="note-tags" data-testid="tab-note-tags">Note Tags</TabsTrigger>
          <TabsTrigger value="file-upload-instructions" data-testid="tab-file-upload-instructions">File Upload Instructions</TabsTrigger>
          <TabsTrigger value="project-type-rules" data-testid="tab-project-type-rules">Risk Assessment</TabsTrigger>
          <TabsTrigger value="bdo-directory" data-testid="tab-bdo-directory">BDO Directory</TabsTrigger>
          <TabsTrigger value="borrower-forms" data-testid="tab-borrower-forms">Borrower Forms</TabsTrigger>
          <TabsTrigger value="borrower-forms-full" data-testid="tab-borrower-forms-full">Borrower Forms - Full Form</TabsTrigger>
          <TabsTrigger value="label-comparison" data-testid="tab-label-comparison">Field Label Comparison</TabsTrigger>
          <TabsTrigger value="theme" data-testid="tab-theme">Theme / CSS</TabsTrigger>
        </TabsList>

        {/* Default Values Tab */}
        <TabsContent value="default-values" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-wsj-prime-rate-title">
                WSJ Prime Rate
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                Set the default Wall Street Journal Prime Rate (percentage with two decimal places). This value will be used on the Funding Structure page.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsj-prime-rate" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                WSJ Prime Rate (%)
              </Label>
              <Input
                id="wsj-prime-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="8.50"
                value={settings.defaultValues?.wsjPrimeRate ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseFloat(e.target.value);
                  setSettings({
                    ...settings,
                    defaultValues: { ...settings.defaultValues, wsjPrimeRate: value } as DefaultValues,
                  });
                  setHasUnsavedChanges(true);
                }}
                className="max-w-xs"
                data-testid="input-wsj-prime-rate"
              />
            </div>
          </div>

          {/* Fee Configurations */}
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">Fee Configurations</h2>
                <p className="text-sm text-[color:var(--t-color-text-muted)]">
                  Define fee amounts based on loan conditions. The system will auto-populate fees in Proposal Letters based on BDO answers in Risk Assessment.
                </p>
              </div>
              <Button onClick={() => openFeeConfigModal()} data-testid="button-add-fee-config">
                <Plus className="w-4 h-4 mr-2" />
                Add Fee
              </Button>
            </div>

            {(!settings.feeConfigurations || settings.feeConfigurations.length === 0) ? (
              <div className="text-center py-8 bg-[var(--t-color-page-bg)] rounded-lg border border-dashed border-[var(--t-color-border)]">
                <p className="text-[color:var(--t-color-text-muted)] mb-3">No fee configurations yet.</p>
                <Button onClick={() => openFeeConfigModal()} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Fee
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--t-color-page-bg)] border-b border-[var(--t-color-border)]">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Fee Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Amount</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Condition</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.feeConfigurations.map((feeConfig) => (
                      <tr key={feeConfig.id} className="border-b border-[var(--t-color-border)] hover:bg-[var(--t-color-page-bg)]" data-testid={`row-fee-config-${feeConfig.id}`}>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-body)]">{feeConfig.feeName}</td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">${feeConfig.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={feeConfig.includesRealEstate ? 'default' : 'secondary'}>
                            Real Estate: {feeConfig.includesRealEstate ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={feeConfig.active ? 'default' : 'secondary'}>
                            {feeConfig.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openFeeConfigModal(feeConfig)} data-testid={`button-edit-fee-config-${feeConfig.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteFeeConfig(feeConfig.id)} data-testid={`button-delete-fee-config-${feeConfig.id}`}>
                              <Trash2 className="w-4 h-4 text-[color:var(--t-color-danger-text)]" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DSCR Default Periods */}
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-dscr-periods-title">
                DSCR Default Periods
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                Set the default periods for the DSCR (Debt Service Coverage Ratio) section at the bottom of the Funding Structure page.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dscr-period-1" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  DSCR Period 1
                </Label>
                      <Select
                        value={settings.defaultValues?.dscrPeriod1 || ''}
                        onValueChange={(value) => {
                          setSettings({
                            ...settings,
                            defaultValues: { ...settings.defaultValues, dscrPeriod1: value } as DefaultValues,
                          });
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <SelectTrigger id="dscr-period-1" data-testid="select-dscr-period-1">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="Interim">Interim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dscr-period-2" className="text-xs text-muted-foreground mb-1 block">
                        Period 2
                      </Label>
                      <Select
                        value={settings.defaultValues?.dscrPeriod2 || ''}
                        onValueChange={(value) => {
                          setSettings({
                            ...settings,
                            defaultValues: { ...settings.defaultValues, dscrPeriod2: value } as DefaultValues,
                          });
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <SelectTrigger id="dscr-period-2" data-testid="select-dscr-period-2">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="Interim">Interim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
              <div className="space-y-2">
                <Label htmlFor="dscr-period-3" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  DSCR Period 3
                </Label>
                <Select
                  value={settings.defaultValues?.dscrPeriod3 || ''}
                  onValueChange={(value) => {
                    setSettings({
                      ...settings,
                      defaultValues: { ...settings.defaultValues, dscrPeriod3: value } as DefaultValues,
                    });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger id="dscr-period-3" data-testid="select-dscr-period-3">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dscr-period-4" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  DSCR Period 4
                </Label>
                <Select
                  value={settings.defaultValues?.dscrPeriod4 || ''}
                  onValueChange={(value) => {
                    setSettings({
                      ...settings,
                      defaultValues: { ...settings.defaultValues, dscrPeriod4: value } as DefaultValues,
                    });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger id="dscr-period-4" data-testid="select-dscr-period-4">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AI Prompts Tab */}
        <TabsContent value="ai-prompts" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-naics-prompt-title">
                NAICS Code Suggestion Prompt
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                This prompt is used to generate NAICS code suggestions based on the industry.
                Use <code className="bg-[var(--t-color-input-bg)] px-2 py-1 rounded text-sm">{'{industry}'}</code> as a placeholder for the industry name.
              </p>
            </div>
            <Textarea
              value={settings.aiPrompts.find(p => p.id === 'naics-suggestion')?.prompt || settings.aiPrompts[0]?.prompt || ''}
              onChange={(e) => {
                const target = settings.aiPrompts.find(p => p.id === 'naics-suggestion') || settings.aiPrompts[0];
                if (target) {
                  updateAIPrompt(target.id, { prompt: e.target.value });
                }
              }}
              className="w-full min-h-[300px] font-mono text-sm"
              placeholder="Enter the NAICS prompt template..."
              data-testid="textarea-naics-prompt"
            />
            <div className="mt-3 text-sm text-[color:var(--t-color-text-muted)]">
              <strong>Available placeholders:</strong> {'{industry}'}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-business-description-title">
                Business Description Prompt
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                This prompt is used to generate comprehensive business descriptions for SBA loan applications.
              </p>
            </div>
            <Textarea
              value={settings.aiPrompts.find(p => p.id === 'business-description')?.prompt || settings.aiPrompts[1]?.prompt || ''}
              onChange={(e) => {
                const target = settings.aiPrompts.find(p => p.id === 'business-description') || settings.aiPrompts[1];
                if (target) {
                  updateAIPrompt(target.id, { prompt: e.target.value });
                }
              }}
              className="w-full min-h-[400px] font-mono text-sm"
              placeholder="Enter the business description prompt template..."
              data-testid="textarea-business-description-prompt"
            />
            <div className="mt-3 text-sm text-[color:var(--t-color-text-muted)]">
              <strong>Available placeholders:</strong> {'{legalName}'}, {'{industry}'}, {'{naicsCode}'}, {'{yearsInOperation}'}, {'{employees}'}, {'{annualRevenue}'}, {'{description}'}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-financial-spread-prompt-title">
                Financial Spread Analysis Prompt
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                This system prompt is sent to Claude when analyzing financial spreads. It controls how the AI evaluates income statements, calculates DSCR trends, assigns repayment scores, and structures its response. Leave empty to use the built-in default prompt.
              </p>
            </div>
            <Textarea
              value={settings.aiPrompts.find(p => p.id === 'financial-spread')?.prompt || settings.aiPrompts[2]?.prompt || ''}
              onChange={(e) => {
                const target = settings.aiPrompts.find(p => p.id === 'financial-spread') || settings.aiPrompts[2];
                if (target) {
                  updateAIPrompt(target.id, { prompt: e.target.value });
                }
              }}
              className="w-full min-h-[500px] font-mono text-sm"
              placeholder="Leave empty to use the default financial analysis prompt. Paste a custom prompt here to override it."
              data-testid="textarea-financial-spread-prompt"
            />
            <div className="mt-3 text-sm text-[color:var(--t-color-text-muted)]">
              <strong>Note:</strong> The prompt receives structured JSON financial period data as user input. The response must be valid JSON matching the expected analysis schema. Modifying the response format may break the analysis display.
            </div>
          </div>
        </TabsContent>

        {/* Questionnaire Rules Tab */}
        <TabsContent value="questionnaire-rules" className="space-y-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)]">Questionnaire Rules</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setImportRulesJson('');
                  setImportRulesError(null);
                  setImportRulesMode('merge');
                  setImportRulesModalOpen(true);
                }}
                data-testid="button-import-rules"
              >
                Import JSON
              </Button>
              <Button onClick={() => openRuleModal()} data-testid="button-add-rule">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap">
            {['All', 'Business Overview', 'Project Purpose', 'Industry'].map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={rulesCategoryFilter === cat ? 'default' : 'outline'}
                onClick={() => setRulesCategoryFilter(cat)}
                data-testid={`button-filter-${cat.toLowerCase().replace(/\s/g, '-')}`}
              >
                {cat}
                <span className="ml-1 opacity-70">
                  ({cat === 'All'
                    ? settings.questionnaireRules.length
                    : settings.questionnaireRules.filter(r => r.mainCategory === cat).length})
                </span>
              </Button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-[var(--t-color-border)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <span className="text-xs">On</span>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'name') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('name');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-name"
                    >
                      Name {rulesSortField === 'name' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'blockType') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('blockType');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-blocktype"
                    >
                      Type {rulesSortField === 'blockType' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'mainCategory') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('mainCategory');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-category"
                    >
                      Category {rulesSortField === 'mainCategory' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs font-medium">Trigger</span>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'questionOrder') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('questionOrder');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-order"
                    >
                      Order {rulesSortField === 'questionOrder' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    <span className="text-xs font-medium">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.questionnaireRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[color:var(--t-color-text-muted)]">
                      No questionnaire rules yet. Add your first rule or import seed rules.
                    </TableCell>
                  </TableRow>
                )}
                {(() => {
                  const filtered = rulesCategoryFilter === 'All'
                    ? settings.questionnaireRules
                    : settings.questionnaireRules.filter(r => r.mainCategory === rulesCategoryFilter);
                  const sorted = [...filtered].sort((a, b) => {
                    const aVal = (a as any)[rulesSortField] ?? 0;
                    const bVal = (b as any)[rulesSortField] ?? 0;
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                      return rulesSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    }
                    return rulesSortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
                  });
                  return sorted.map((rule) => (
                    <TableRow key={rule.id} className={!rule.enabled ? 'opacity-50' : ''} data-testid={`rule-row-${rule.id}`}>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => {
                            setSettings({
                              ...settings,
                              questionnaireRules: settings.questionnaireRules.map((r) =>
                                r.id === rule.id ? { ...r, enabled: checked } : r
                              ),
                            });
                            setHasUnsavedChanges(true);
                          }}
                          data-testid={`switch-rule-enabled-${rule.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm text-[color:var(--t-color-text-body)]" data-testid={`text-rule-name-${rule.id}`}>
                            {rule.name}
                          </span>
                          {rule.blockType === 'question' && rule.questionText && (
                            <p className="text-xs text-[color:var(--t-color-text-muted)] mt-0.5 line-clamp-1" data-testid={`text-rule-question-${rule.id}`}>
                              {rule.questionText}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-rule-type-${rule.id}`}>
                          {rule.blockType === 'question' ? 'Question' : 'AI'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[color:var(--t-color-text-body)]" data-testid={`text-rule-category-${rule.id}`}>
                          {rule.mainCategory}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[color:var(--t-color-text-muted)]">
                          {rule.mainCategory === 'Project Purpose' && rule.purposeKey
                            ? rule.purposeKey
                            : rule.mainCategory === 'Industry' && rule.naicsCodes?.length
                              ? `NAICS: ${rule.naicsCodes.join(', ')}`
                              : '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[color:var(--t-color-text-body)]">{rule.questionOrder || rule.order}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openRuleModal(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestionnaireRule(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Rule Modal */}
        <Dialog open={importRulesModalOpen} onOpenChange={setImportRulesModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-import-rules">
            <DialogHeader>
              <DialogTitle>Import Questionnaire Rules from JSON</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-[color:var(--t-color-text-secondary)]">
                Paste the exported JSON array from replit. Snake_case fields (main_category, question_text, etc.) are auto-mapped.
              </p>
              <div className="flex gap-4 items-center">
                <Label className="text-sm">Mode:</Label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={importRulesMode === 'merge'}
                    onChange={() => setImportRulesMode('merge')}
                  />
                  Merge (upsert by id)
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    checked={importRulesMode === 'replace'}
                    onChange={() => setImportRulesMode('replace')}
                  />
                  Replace all
                </label>
              </div>
              <Textarea
                value={importRulesJson}
                onChange={(e) => setImportRulesJson(e.target.value)}
                placeholder='[ { "id": "...", "name": "...", "main_category": "Business Overview", ... } ]'
                className="font-mono text-xs min-h-[300px]"
                data-testid="textarea-import-rules-json"
              />
              {importRulesError && (
                <p className="text-sm text-red-600" data-testid="text-import-rules-error">{importRulesError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportRulesModalOpen(false)}>Cancel</Button>
              <Button onClick={handleImportQuestionnaireRules} data-testid="button-confirm-import-rules">
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-rule-form">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="rule-name">Name *</Label>
                <Input
                  id="rule-name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="Enter rule name"
                  data-testid="input-rule-name"
                />
              </div>

              <div>
                <Label>Block Type *</Label>
                <RadioGroup
                  value={ruleForm.blockType}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, blockType: value as 'question' | 'ai-generated' })}
                  data-testid="radio-rule-block-type"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="question" id="block-question" data-testid="radio-block-type-question" />
                    <Label htmlFor="block-question">Question</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ai-generated" id="block-ai" data-testid="radio-block-type-ai-generated" />
                    <Label htmlFor="block-ai">AI Generated</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="main-category">Main Category *</Label>
                <Select
                  value={ruleForm.mainCategory}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, mainCategory: value as 'Business Overview' | 'Project Purpose' | 'Industry' })}
                >
                  <SelectTrigger id="main-category" data-testid="select-main-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Business Overview">Business Overview</SelectItem>
                    <SelectItem value="Project Purpose">Project Purpose</SelectItem>
                    <SelectItem value="Industry">Industry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ruleForm.blockType === 'question' && (
                <div>
                  <Label htmlFor="question-text">Question Text *</Label>
                  <Textarea
                    id="question-text"
                    value={ruleForm.questionText}
                    onChange={(e) => setRuleForm({ ...ruleForm, questionText: e.target.value })}
                    placeholder="Enter the question to display"
                    className="min-h-[100px]"
                    data-testid="textarea-question-text"
                  />
                </div>
              )}

              {ruleForm.blockType === 'ai-generated' && (
                <div>
                  <Label htmlFor="template-select">AI Block Template *</Label>
                  <Select
                    value={ruleForm.aiBlockTemplateId}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, aiBlockTemplateId: value })}
                  >
                    <SelectTrigger id="template-select" data-testid="select-ai-template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.aiBlockTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-order">Order</Label>
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mb-1">Global display order</p>
                  <Input
                    id="rule-order"
                    type="number"
                    value={ruleForm.order}
                    onChange={(e) => setRuleForm({ ...ruleForm, order: parseInt(e.target.value) || 0 })}
                    data-testid="input-rule-order"
                  />
                </div>
                <div>
                  <Label htmlFor="rule-question-order">Question Order (within group)</Label>
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mb-1">Order within category group</p>
                  <Input
                    id="rule-question-order"
                    type="number"
                    value={ruleForm.questionOrder || 0}
                    onChange={(e) => setRuleForm({ ...ruleForm, questionOrder: parseInt(e.target.value) || 0 })}
                    data-testid="input-rule-question-order"
                  />
                </div>
              </div>

              {ruleForm.mainCategory === 'Project Purpose' && (
                <div>
                  <Label htmlFor="rule-purpose-key">Purpose Key</Label>
                  <Select
                    value={ruleForm.purposeKey || ''}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, purposeKey: value || '' })}
                  >
                    <SelectTrigger id="rule-purpose-key" data-testid="select-purpose-key">
                      <SelectValue placeholder="Select a purpose key" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business Acquisition / Change of Ownership">Business Acquisition / Change of Ownership</SelectItem>
                      <SelectItem value="Commercial Real Estate: Construction">CRE: Construction</SelectItem>
                      <SelectItem value="Commercial Real Estate: Improvements">CRE: Improvements</SelectItem>
                      <SelectItem value="Commercial Real Estate: Purchase">CRE: Purchase</SelectItem>
                      <SelectItem value="Debt Refinance">Debt Refinance</SelectItem>
                      <SelectItem value="Equipment Acquisition / Installation">Equipment Acquisition / Installation</SelectItem>
                      <SelectItem value="Existing Business">Existing Business</SelectItem>
                      <SelectItem value="Expansion">Expansion</SelectItem>
                      <SelectItem value="Franchise">Franchise</SelectItem>
                      <SelectItem value="Inventory Acquisition">Inventory Acquisition</SelectItem>
                      <SelectItem value="Partner Buyout">Partner Buyout</SelectItem>
                      <SelectItem value="Start Up">Start Up</SelectItem>
                      <SelectItem value="Transition Risk">Transition Risk</SelectItem>
                      <SelectItem value="Working Capital">Working Capital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {ruleForm.mainCategory === 'Industry' && (
                <div>
                  <Label htmlFor="rule-naics-codes">NAICS Codes (comma-separated prefixes)</Label>
                  <Input
                    id="rule-naics-codes"
                    value={(ruleForm.naicsCodes || []).join(', ')}
                    onChange={(e) => setRuleForm({
                      ...ruleForm,
                      naicsCodes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="e.g., 44, 45"
                    data-testid="input-naics-codes"
                  />
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1">NAICS code prefixes that this rule applies to</p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="rule-enabled"
                  checked={ruleForm.enabled}
                  onCheckedChange={(checked) => setRuleForm({ ...ruleForm, enabled: checked })}
                  data-testid="switch-rule-enabled"
                />
                <Label htmlFor="rule-enabled">Enabled</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRuleModalOpen(false)} data-testid="button-cancel-rule">
                Cancel
              </Button>
              <Button
                onClick={handleRuleSubmit}
                data-testid="button-submit-rule"
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Modal */}
        <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template-form">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add New Template'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="template-name">Name *</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Enter template name"
                  data-testid="input-template-name"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description *</Label>
                <Textarea
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Enter template description"
                  className="min-h-[80px]"
                  data-testid="textarea-template-description"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Input Fields</Label>
                  <Button variant="outline" size="sm" onClick={addInputField} data-testid="button-add-input-field">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field
                  </Button>
                </div>
                <div className="space-y-3">
                  {templateForm.inputFields.length === 0 ? (
                    <p className="text-sm text-[color:var(--t-color-text-muted)] text-center py-4">
                      No input fields yet. Add fields to collect data for AI generation.
                    </p>
                  ) : (
                    templateForm.inputFields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg" data-testid={`input-field-${index}`}>
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <Input
                              value={field.name}
                              onChange={(e) => updateInputField(index, { name: e.target.value })}
                              placeholder="Field name"
                              data-testid={`input-field-name-${index}`}
                            />
                          </div>
                          <div>
                            <Input
                              value={field.label}
                              onChange={(e) => updateInputField(index, { label: e.target.value })}
                              placeholder="Label"
                              data-testid={`input-field-label-${index}`}
                            />
                          </div>
                          <div>
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateInputField(index, { type: value as 'text' | 'textarea' | 'number' })}
                            >
                              <SelectTrigger data-testid={`select-field-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateInputField(index, { required: e.target.checked })}
                                className="w-4 h-4"
                                data-testid={`checkbox-field-required-${index}`}
                              />
                              Required
                            </label>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInputField(index)}
                          data-testid={`button-remove-field-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="prompt-template">Prompt Template *</Label>
                <Textarea
                  id="prompt-template"
                  value={templateForm.prompt}
                  onChange={(e) => setTemplateForm({ ...templateForm, prompt: e.target.value })}
                  placeholder="Enter the AI prompt template. Use {fieldName} for placeholders that match input field names."
                  className="min-h-[150px] font-mono text-sm"
                  data-testid="textarea-prompt-template"
                />
                <p className="text-sm text-[color:var(--t-color-text-muted)] mt-2">
                  Use placeholders like {'{fieldName}'} to reference input field values in the prompt.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateModalOpen(false)} data-testid="button-cancel-template">
                Cancel
              </Button>
              <Button
                onClick={handleTemplateSubmit}
                data-testid="button-submit-template"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Type Rules Tab */}
        <TabsContent value="project-type-rules" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-project-type-rules-title">Risk Assessment Rules</h2>
                <p className="text-sm text-[color:var(--t-color-text-muted)]">
                  Configure project types and risk levels that are automatically assigned based on BDO answers to classification questions.
                  Rules are evaluated by priority (lowest number first), and the first matching rule determines the project type and risk level.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleImportRiskAssessmentRules} variant="outline" data-testid="button-import-risk-rules">
                  <FileUp className="w-4 h-4 mr-2" />
                  Import Rules
                </Button>
                <Button onClick={() => openProjectTypeRuleModal()} data-testid="button-add-project-type-rule">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project Type
                </Button>
              </div>
            </div>

            {settings.projectTypeRules.length > 0 ? (
              <div className="space-y-4">
                {settings.projectTypeRules
                  .sort((a, b) => (a.priority ?? ((a as unknown as {order?: number}).order) ?? 0) - (b.priority ?? ((b as unknown as {order?: number}).order) ?? 0))
                  .map((rule) => (
                    <div
                      key={rule.id}
                      className={`border rounded-lg p-4 ${rule.isFallback ? 'border-amber-300 bg-amber-50' : 'border-[var(--t-color-border)]'}`}
                      data-testid={`project-type-rule-${rule.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-[color:var(--t-color-text-muted)]">P{rule.priority ?? ((rule as unknown as {order?: number}).order) ?? 0}</span>
                            <h3 className="font-semibold text-[color:var(--t-color-text-body)]" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h3>
                            {rule.isFallback && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Fallback</Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                rule.riskLevel === 'low'
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : rule.riskLevel === 'low-medium'
                                  ? 'bg-lime-100 text-lime-800 border-lime-300'
                                  : rule.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                  : rule.riskLevel === 'medium-high'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : rule.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : rule.riskLevel === 'very-high'
                                  ? 'bg-red-200 text-red-900 border-red-400'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              }
                              data-testid={`badge-risk-level-${rule.id}`}
                            >
                              {rule.riskLevel === 'low' ? 'Low' : rule.riskLevel === 'low-medium' ? 'Low-Medium' : rule.riskLevel === 'medium' ? 'Medium' : rule.riskLevel === 'medium-high' ? 'Medium-High' : rule.riskLevel === 'high' ? 'High' : rule.riskLevel === 'very-high' ? 'Very High' : 'Medium'}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-[color:var(--t-color-text-muted)] mb-3">{rule.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {getConditionBadge(rule.isStartup, 'Startup')}
                            {getConditionBadge(rule.hasExistingCashflow, 'Existing Cashflow')}
                            {getConditionBadge(rule.hasTransitionRisk, 'Transition Risk')}
                            {getConditionBadge(rule.includesRealEstate, 'Real Estate')}
                            {rule.creScope !== 'any' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                CRE: {rule.creScope === 'purchase' ? 'Purchase' : 'Improvement'}
                              </span>
                            )}
                            {getConditionBadge(rule.isPartnerBuyout, 'Partner Buyout')}
                            {getConditionBadge(rule.involvesConstruction, 'Construction')}
                            {getConditionBadge(rule.includesDebtRefinance, 'Debt Refinance')}
                            {getConditionBadge(rule.debtRefinancePrimary, 'Debt Refi Primary')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openProjectTypeRuleModal(rule)}
                            data-testid={`button-edit-rule-${rule.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProjectTypeRule(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[color:var(--t-color-text-muted)]" data-testid="text-no-project-type-rules">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No project type rules configured yet.</p>
                <p className="text-sm mt-1">Add rules to automatically classify projects based on BDO answers.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Project Type Rule Modal */}
        <Dialog open={projectTypeRuleModalOpen} onOpenChange={setProjectTypeRuleModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-project-type-rule-form">
            <DialogHeader>
              <DialogTitle>{editingProjectTypeRule ? 'Edit Project Type Rule' : 'Add Project Type Rule'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project-type-rule-name">Rule Name *</Label>
                  <Input
                    id="project-type-rule-name"
                    value={projectTypeRuleForm.name}
                    onChange={(e) => setProjectTypeRuleForm({ ...projectTypeRuleForm, name: e.target.value })}
                    placeholder="e.g., Startup with Real Estate"
                    data-testid="input-project-type-rule-name"
                  />
                </div>
                <div>
                  <Label htmlFor="project-type-rule-priority">Priority</Label>
                  <Input
                    id="project-type-rule-priority"
                    type="number"
                    value={projectTypeRuleForm.priority}
                    onChange={(e) => setProjectTypeRuleForm({ ...projectTypeRuleForm, priority: parseInt(e.target.value) || 0 })}
                    data-testid="input-project-type-rule-priority"
                  />
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1">Lower number = higher priority (evaluated first)</p>
                </div>
              </div>

              <div>
                <Label htmlFor="project-type-rule-description">Description</Label>
                <Textarea
                  id="project-type-rule-description"
                  value={projectTypeRuleForm.description || ''}
                  onChange={(e) => setProjectTypeRuleForm({ ...projectTypeRuleForm, description: e.target.value })}
                  placeholder="Optional description of when this rule applies"
                  className="min-h-[80px]"
                  data-testid="textarea-project-type-rule-description"
                />
              </div>

              <div>
                <Label>Risk Level *</Label>
                <RadioGroup
                  value={projectTypeRuleForm.riskLevel}
                  onValueChange={(value) => setProjectTypeRuleForm({ ...projectTypeRuleForm, riskLevel: value as RiskLevel })}
                  className="flex flex-wrap gap-4 mt-2"
                  data-testid="radio-risk-level"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk-low" data-testid="radio-risk-low" />
                    <Label htmlFor="risk-low" className="text-green-700">Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low-medium" id="risk-low-medium" data-testid="radio-risk-low-medium" />
                    <Label htmlFor="risk-low-medium" className="text-lime-700">Low-Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk-medium" data-testid="radio-risk-medium" />
                    <Label htmlFor="risk-medium" className="text-yellow-600">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium-high" id="risk-medium-high" data-testid="radio-risk-medium-high" />
                    <Label htmlFor="risk-medium-high" className="text-orange-600">Medium-High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk-high" data-testid="radio-risk-high" />
                    <Label htmlFor="risk-high" className="text-red-600">High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very-high" id="risk-very-high" data-testid="radio-risk-very-high" />
                    <Label htmlFor="risk-very-high" className="text-red-900">Very High</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="project-type-rule-fallback"
                  checked={projectTypeRuleForm.isFallback}
                  onCheckedChange={(checked) => setProjectTypeRuleForm({ ...projectTypeRuleForm, isFallback: checked })}
                  data-testid="switch-project-type-rule-fallback"
                />
                <Label htmlFor="project-type-rule-fallback">Fallback Rule (used when no other rules match)</Label>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Classification Conditions</Label>
                <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                  Set conditions for this rule. &quot;Any&quot; means the condition will match regardless of the answer.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition-startup">Is this a startup business?</Label>
                    <Select
                      value={String(projectTypeRuleForm.isStartup)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        isStartup: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-startup" data-testid="select-condition-startup">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-cashflow">Has existing cashflow?</Label>
                    <Select
                      value={String(projectTypeRuleForm.hasExistingCashflow)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        hasExistingCashflow: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-cashflow" data-testid="select-condition-cashflow">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-transition">Has transition risk?</Label>
                    <Select
                      value={String(projectTypeRuleForm.hasTransitionRisk)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        hasTransitionRisk: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-transition" data-testid="select-condition-transition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-realestate">Includes real estate?</Label>
                    <Select
                      value={String(projectTypeRuleForm.includesRealEstate)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        includesRealEstate: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-realestate" data-testid="select-condition-realestate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-cre-scope">CRE Scope</Label>
                    <Select
                      value={projectTypeRuleForm.creScope}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        creScope: value as CREScope
                      })}
                    >
                      <SelectTrigger id="condition-cre-scope" data-testid="select-condition-cre-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-buyout">Is partner buyout?</Label>
                    <Select
                      value={String(projectTypeRuleForm.isPartnerBuyout)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        isPartnerBuyout: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-buyout" data-testid="select-condition-buyout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-construction">Involves construction?</Label>
                    <Select
                      value={String(projectTypeRuleForm.involvesConstruction)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        involvesConstruction: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-construction" data-testid="select-condition-construction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-debt-refinance">Includes Debt Refinance?</Label>
                    <Select
                      value={String(projectTypeRuleForm.includesDebtRefinance)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        includesDebtRefinance: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-debt-refinance" data-testid="select-condition-debt-refinance">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-debt-refinance-primary">Debt Refinance Primary?</Label>
                    <Select
                      value={String(projectTypeRuleForm.debtRefinancePrimary)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        debtRefinancePrimary: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-debt-refinance-primary" data-testid="select-condition-debt-refinance-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectTypeRuleModalOpen(false)} data-testid="button-cancel-project-type-rule">
                Cancel
              </Button>
              <Button
                onClick={handleProjectTypeRuleSubmit}
                data-testid="button-submit-project-type-rule"
              >
                {editingProjectTypeRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BDO Directory Tab */}
        <TabsContent value="bdo-directory" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">BDO Directory</h2>
                <p className="text-sm text-[color:var(--t-color-text-muted)]">
                  Manage team members and their contact information for loan applications and proposal letters.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={loadAppUsers}
                  variant="outline"
                  disabled={isLoadingUsers}
                >
                  {isLoadingUsers ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button onClick={() => setAddUserModalOpen(true)} data-testid="button-add-bdo">
                  <Plus className="w-4 h-4 mr-2" />
                  Add BDO
                </Button>
              </div>
            </div>

            {appUsers.length > 0 && (
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="max-w-md"
                  data-testid="input-bdo-search"
                />
              </div>
            )}

            {isLoadingUsers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--t-color-accent)] border-t-transparent rounded-full"></div>
                <p className="text-[color:var(--t-color-text-muted)] mt-4">Loading users...</p>
              </div>
            ) : appUsers.length === 0 ? (
              <div className="text-center py-12 bg-[var(--t-color-page-bg)] rounded-lg border border-dashed border-[var(--t-color-border)]">
                <p className="text-[color:var(--t-color-text-muted)] mb-4">No BDOs have been added yet.</p>
                <Button onClick={() => setAddUserModalOpen(true)} variant="outline" data-testid="button-add-first-bdo">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First BDO
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--t-color-page-bg)] border-b border-[var(--t-color-border)]">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Phone</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Role</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Title</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appUsers
                      .filter((user) => {
                        if (!userSearchQuery.trim()) return true;
                        const query = userSearchQuery.toLowerCase();
                        return (
                          (user.email || '').toLowerCase().includes(query) ||
                          (user.displayName || '').toLowerCase().includes(query) ||
                          user.role.toLowerCase().includes(query)
                        );
                      })
                      .map((user) => (
                      <tr key={user.uid} className="border-b border-[var(--t-color-border)] hover:bg-[var(--t-color-page-bg)]" data-testid={`row-bdo-${user.uid}`}>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-body)]">
                          {user.displayName || 'No name'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">
                          {user.email || 'No email'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">-</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'Credit Executive' ? 'default' : user.role === 'BDO Manager' ? 'secondary' : 'outline'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">-</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAppUser(user.uid, user.email)}
                              disabled={isDeletingUser === user.uid || user.uid === userInfo?.uid}
                              data-testid={`button-delete-bdo-${user.uid}`}
                            >
                              {isDeletingUser === user.uid ? (
                                <span className="animate-spin">&#10227;</span>
                              ) : (
                                <Trash2 className="w-4 h-4 text-[color:var(--t-color-danger-text)]" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* AI Block Templates Tab */}
        <TabsContent value="ai-block-templates" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)]">AI Block Templates</h2>
            <Button onClick={() => openTemplateModal()} data-testid="button-add-template">
              <Plus className="w-4 h-4 mr-2" />
              Add New Template
            </Button>
          </div>

          <div className="space-y-4">
            {settings.aiBlockTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border border-[var(--t-color-border)] p-6" data-testid={`template-card-${template.id}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid={`text-template-name-${template.id}`}>{template.name}</h3>
                    <p className="text-sm text-[color:var(--t-color-text-muted)] mb-2" data-testid={`text-template-description-${template.id}`}>{template.description}</p>
                    <p className="text-sm text-[color:var(--t-color-text-muted)]" data-testid={`text-template-fields-${template.id}`}>
                      <strong>Input Fields:</strong> {template.inputFields.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openTemplateModal(template)} data-testid={`button-edit-template-${template.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAIBlockTemplate(template.id)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {template.inputFields.length > 0 && (
                  <div className="mt-3 p-3 bg-[var(--t-color-page-bg)] rounded">
                    <p className="text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Fields:</p>
                    <div className="space-y-1">
                      {template.inputFields.map((field, idx) => (
                        <p key={idx} className="text-sm text-[color:var(--t-color-text-muted)]" data-testid={`text-template-field-${template.id}-${idx}`}>
                          &bull; {field.label} ({field.type}){field.required ? ' *' : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {settings.aiBlockTemplates.length === 0 && (
              <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-12 text-center">
                <p className="text-[color:var(--t-color-text-muted)]">No AI block templates yet. Add your first template to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Note Tags Tab */}
        <TabsContent value="note-tags" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">Note Tags</h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Manage the available tags that users can apply to project notes.
              </p>
            </div>

            <div className="mb-6">
              <Label htmlFor="new-tag">Add New Tag</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="new-tag"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Enter tag name"
                  data-testid="input-new-tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNoteTag();
                    }
                  }}
                />
                <Button
                  onClick={addNoteTag}
                  data-testid="button-add-tag"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tag
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Current Tags</Label>
              <div className="flex flex-wrap gap-2">
                {settings.noteTags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--t-color-page-bg)] border border-[var(--t-color-border)] rounded-lg"
                    data-testid={`tag-${tag.toLowerCase().replace(' ', '-')}`}
                  >
                    <span className="text-sm text-[color:var(--t-color-text-body)]">{tag}</span>
                    <button
                      onClick={() => deleteNoteTag(tag)}
                      className="p-0.5 rounded hover:bg-red-50 text-[color:var(--t-color-danger-light)]"
                      title="Remove tag"
                      data-testid={`button-remove-tag-${tag.toLowerCase().replace(' ', '-')}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {settings.noteTags.length === 0 && (
                <p className="text-sm text-[color:var(--t-color-text-muted)] mt-2">No tags defined. Add at least one tag to get started.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* File Upload Instructions Tab */}
        <TabsContent value="file-upload-instructions" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">File Upload Instructions</h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Configure the instructions displayed for each file upload section in the loan application.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="instructions-business-applicant" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Business Applicant
                </Label>
                <Textarea
                  id="instructions-business-applicant"
                  value={settings.fileUploadInstructions?.businessApplicant || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        businessApplicant: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for business applicant file uploads..."
                  data-testid="textarea-instructions-business-applicant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions-individual-applicants" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Individual Applicants
                </Label>
                <Textarea
                  id="instructions-individual-applicants"
                  value={settings.fileUploadInstructions?.individualApplicants || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        individualApplicants: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for individual applicant file uploads..."
                  data-testid="textarea-instructions-individual-applicants"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions-other-businesses" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Other Businesses
                </Label>
                <Textarea
                  id="instructions-other-businesses"
                  value={settings.fileUploadInstructions?.otherBusinesses || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        otherBusinesses: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for other businesses file uploads..."
                  data-testid="textarea-instructions-other-businesses"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions-project-files" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Project Files
                </Label>
                <Textarea
                  id="instructions-project-files"
                  value={settings.fileUploadInstructions?.projectFiles || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        projectFiles: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for project file uploads..."
                  data-testid="textarea-instructions-project-files"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Borrower Forms Tab */}
        <TabsContent value="borrower-forms" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-borrower-forms-title">
                Borrower Form Templates
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                These are the PDF forms generated when a BDO clicks &quot;Borrower Forms&quot; on a project. Each form is pre-filled with data from the loan application. Forms are generated based on the rules below.
              </p>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2" data-testid="text-generation-rules-title">Generation Rules</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li><span className="font-medium">Business Information</span> — Always generated (1 per project)</li>
                <li><span className="font-medium">T Bank Loan Application (Consolidated)</span> — Fillable PDF generated once per individual applicant. Includes Applicant Info, Ownership Structure, Businesses Owned/Controlled, Project Information, and Borrower Personal Information (Citizenship). Pre-fills from application data where available.</li>
                <li><span className="font-medium">Personal Information, SBA Eligibility, Personal Financial Statement</span> — Generated once per individual applicant</li>
                <li><span className="font-medium">Seller Information</span> — Only generated when project purpose includes &quot;Business Acquisition&quot;</li>
                <li><span className="font-medium">Business Questionnaire</span> — Always generated (1 per project). Dynamic fillable PDF based on admin-configured questionnaire rules, filtered by project purpose and NAICS code. BDO can delete individual questions per project and regenerate them.</li>
              </ul>
            </div>

            <div className="space-y-4">
              {BORROWER_FORM_TEMPLATES.map((template) => {
                const fieldsBySection: Record<string, typeof template.fields> = {};
                template.fields.forEach(f => {
                  const section = f.section || 'General';
                  if (!fieldsBySection[section]) fieldsBySection[section] = [];
                  fieldsBySection[section].push(f);
                });

                const typeLabel = template.applicantType === 'individual' ? 'Per Individual Applicant' :
                  template.applicantType === 'business' ? 'Per Project (Always)' :
                  template.applicantType === 'seller' ? 'Conditional' : 'Per Project';

                const typeBadgeVariant = template.applicantType === 'individual' ? 'default' :
                  template.applicantType === 'seller' ? 'secondary' : 'outline';

                return (
                  <div
                    key={template.id}
                    className="border border-[var(--t-color-border)] rounded-lg overflow-hidden"
                    data-testid={`card-form-template-${template.id}`}
                  >
                    <div className="bg-[var(--t-color-page-bg)] px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--t-color-border)]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)]" data-testid={`text-template-name-${template.id}`}>
                          {template.name}
                        </h3>
                        <Badge variant={typeBadgeVariant} data-testid={`badge-template-type-${template.id}`}>
                          {typeLabel}
                        </Badge>
                        {template.projectPurposes && template.projectPurposes.length > 0 && (
                          <span className="text-xs text-[color:var(--t-color-text-muted)]">
                            Requires: {template.projectPurposes.join(' or ')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[color:var(--t-color-text-muted)]" data-testid={`text-field-count-${template.id}`}>
                        {template.fields.length} fields
                      </span>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-sm text-[color:var(--t-color-text-muted)] mb-3">{template.description}</p>
                      <div className="space-y-3">
                        {Object.entries(fieldsBySection).map(([section, fields]) => (
                          <div key={section}>
                            {section !== 'General' && (
                              <p className="text-xs font-semibold text-[color:var(--t-color-text-body)] uppercase tracking-wide mb-1">{section}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                              {fields.map(field => (
                                <div
                                  key={field.fieldId}
                                  className="flex items-center justify-between py-1 border-b border-dashed border-[var(--t-color-border)] last:border-0"
                                  data-testid={`row-field-${template.id}-${field.fieldId}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-[color:var(--t-color-text-body)]">{field.label}</span>
                                    {field.required && (
                                      <span className="text-[length:var(--t-font-size-sm)] text-red-500 font-medium">REQ</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[length:var(--t-font-size-sm)] font-mono py-0 px-1.5">
                                      {field.type}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-[var(--t-color-border)]">
                        <p className="text-xs text-[color:var(--t-color-primary-pale)]">
                          Data source: <span className="font-mono text-[color:var(--t-color-text-muted)]">{template.fields[0]?.applicationPath.split('.{index}')[0].split('.')[0] || 'applicationData'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Borrower Forms - Full Form Tab */}
        <TabsContent value="borrower-forms-full" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-full-form-title">
                Borrower Forms - Full Form Field Reference
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Complete mapping of all fields visible to the Borrower across sections 3-11.
                This reference shows every field label, input type, dropdown options, data path, and conditional logic.
                Use this to plan dynamically produced Borrower documents.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-[color:var(--t-color-text-muted)]">Per Applicant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-[color:var(--t-color-text-muted)]">Per Project</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-[color:var(--t-color-text-muted)]">Conditional</span>
              </div>
              <div className="text-xs text-[color:var(--t-color-primary-pale)] ml-auto">
                {BORROWER_FULL_FORM_SECTIONS.reduce((sum, s) => sum + s.fields.length, 0)} total fields across {BORROWER_FULL_FORM_SECTIONS.length} sections
              </div>
            </div>

            <div className="space-y-6">
              {BORROWER_FULL_FORM_SECTIONS.map((section) => {
                const groupedFields: Record<string, typeof section.fields> = {};
                section.fields.forEach(f => {
                  let group = 'General';
                  if (f.fieldId.startsWith('pfs-')) {
                    if (f.fieldId.includes('contingent')) group = 'Contingent Liabilities';
                    else if (f.fieldId.startsWith('pfs-note')) group = 'Schedule: Notes Payable';
                    else if (f.fieldId.startsWith('pfs-sec')) group = 'Schedule: Stocks & Bonds';
                    else if (f.fieldId.startsWith('pfs-re')) group = 'Schedule: Real Estate Owned';
                    else if (f.fieldId.includes('Desc')) group = 'Descriptive Fields';
                    else if (f.dataPath.includes('.income.')) group = 'Source of Income';
                    else if (f.dataPath.includes('.liabilities.')) group = 'Liabilities';
                    else if (f.dataPath.includes('.assets.')) group = 'Assets';
                    else group = 'General';
                  }
                  if (!groupedFields[group]) groupedFields[group] = [];
                  groupedFields[group].push(f);
                });

                return (
                  <div
                    key={section.sectionId}
                    className="border border-[var(--t-color-border)] rounded-lg overflow-hidden"
                    data-testid={`card-full-section-${section.sectionId}`}
                  >
                    <div className="bg-[var(--t-color-page-bg)] px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--t-color-border)]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)]" data-testid={`text-section-name-${section.sectionId}`}>
                          {section.borrowerLabel}
                        </h3>
                        <span className="text-xs text-[color:var(--t-color-text-muted)]">
                          (Internal ID: {section.sectionId})
                        </span>
                        <Badge variant={section.perApplicant ? 'default' : 'outline'} data-testid={`badge-section-scope-${section.sectionId}`}>
                          {section.perApplicant ? 'Per Individual Applicant' : 'Per Project'}
                        </Badge>
                        {section.conditionalOn && (
                          <Badge variant="secondary" data-testid={`badge-section-condition-${section.sectionId}`}>
                            Conditional
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-[color:var(--t-color-text-muted)]" data-testid={`text-section-field-count-${section.sectionId}`}>
                        {section.fields.length} fields
                      </span>
                    </div>
                    <div className="px-5 py-3">
                      <p className="text-sm text-[color:var(--t-color-text-muted)] mb-3">{section.description}</p>
                      {section.conditionalOn && (
                        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          Condition: {section.conditionalOn}
                        </div>
                      )}
                      {section.sectionId === 4 && (
                        <div className="mb-4 border border-[var(--t-color-info-border)] bg-[var(--t-color-info-bg)] rounded-lg p-4" data-testid="info-indirect-ownership">
                          <h4 className="text-sm font-semibold text-[color:var(--t-color-primary)] mb-3">Indirect Ownership (Borrower Help Content)</h4>
                          <p className="text-xs text-[color:var(--t-color-text-body)] mb-3">
                            This visual and explanation is shown to borrowers via a &quot;Learn More About Indirect Ownership&quot; link inside the &quot;About This Section&quot; panel on the Individual Applicants step.
                          </p>
                          <IndirectOwnershipExplainer />
                        </div>
                      )}
                      <div className="space-y-4">
                        {Object.entries(groupedFields).map(([group, fields]) => (
                          <div key={group}>
                            {group !== 'General' && (
                              <p className="text-xs font-semibold text-[color:var(--t-color-text-body)] uppercase tracking-wide mb-2 mt-2">{group}</p>
                            )}
                            <div className="border border-[var(--t-color-border)] rounded overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-[var(--t-color-input-bg)] text-left">
                                    <th className="px-3 py-1.5 text-xs font-medium text-[color:var(--t-color-text-body)] w-[30%]">Field Label</th>
                                    <th className="px-3 py-1.5 text-xs font-medium text-[color:var(--t-color-text-body)] w-[10%]">Type</th>
                                    <th className="px-3 py-1.5 text-xs font-medium text-[color:var(--t-color-text-body)] w-[30%]">Options / Values</th>
                                    <th className="px-3 py-1.5 text-xs font-medium text-[color:var(--t-color-text-body)] w-[30%]">Data Path</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {fields.map((field, idx) => (
                                    <tr
                                      key={field.fieldId}
                                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}
                                      data-testid={`row-full-field-${section.sectionId}-${field.fieldId}`}
                                    >
                                      <td className="px-3 py-2 align-top">
                                        <div className="flex items-start gap-1.5 flex-wrap">
                                          <span className="text-[color:var(--t-color-text-body)]">{field.label}</span>
                                          {field.required && (
                                            <span className="text-[length:var(--t-font-size-sm)] text-red-500 font-medium mt-0.5">REQ</span>
                                          )}
                                          {field.perApplicant && (
                                            <span className="text-[length:var(--t-font-size-sm)] text-blue-500 font-medium mt-0.5">x N</span>
                                          )}
                                        </div>
                                        {field.conditional && (
                                          <p className="text-[length:var(--t-font-size-sm)] text-amber-600 mt-0.5">{field.conditional}</p>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        <Badge variant="outline" className="text-[length:var(--t-font-size-sm)] font-mono py-0 px-1.5">
                                          {field.type}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        {field.options && field.options.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {field.options.map((opt, oi) => (
                                              <span
                                                key={oi}
                                                className="inline-block text-[length:var(--t-font-size-sm)] bg-[var(--t-color-info-bg)] text-[color:var(--t-color-primary)] border border-[var(--t-color-info-border)] rounded px-1.5 py-0.5"
                                              >
                                                {opt}
                                              </span>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-[color:var(--t-color-primary-pale)] text-xs">&mdash;</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 align-top">
                                        <code className="text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-muted)] font-mono break-all">{field.dataPath}</code>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Field Label Comparison Tab */}
        <TabsContent value="label-comparison" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-label-comparison-title">
                Field Label Comparison &mdash; BDO vs. Borrower
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Side-by-side view of how field labels appear to the BDO versus the Borrower.
                Only sections with mapped dual labels are shown. Fields without a BDO label defined will show &ldquo;&mdash;&rdquo; in the BDO column.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-[color:var(--t-color-text-muted)]">Has dual label</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-xs text-[color:var(--t-color-text-muted)]">Same label (no BDO override)</span>
              </div>
              <div className="text-xs text-[color:var(--t-color-primary-pale)] ml-auto">
                {BORROWER_FULL_FORM_SECTIONS.filter(s => s.fields.some(f => f.bdoLabel)).length} section(s) with dual labels
              </div>
            </div>

            <div className="space-y-6">
              {BORROWER_FULL_FORM_SECTIONS.filter(s => s.fields.some(f => f.bdoLabel)).map((section) => (
                <div
                  key={section.sectionId}
                  className="border border-[var(--t-color-border)] rounded-lg overflow-hidden"
                  data-testid={`card-label-comparison-${section.sectionId}`}
                >
                  <div className="bg-[var(--t-color-page-bg)] px-5 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--t-color-border)]">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)]" data-testid={`text-comparison-section-${section.sectionId}`}>
                        Section {section.sectionId}: {section.sectionName}
                      </h3>
                      <Badge variant="outline">
                        {section.fields.filter(f => f.bdoLabel).length} / {section.fields.length} fields mapped
                      </Badge>
                    </div>
                  </div>
                  <div className="px-5 py-3">
                    <div className="border border-[var(--t-color-border)] rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--t-color-input-bg)] text-left">
                            <th className="px-3 py-2 text-xs font-medium text-[color:var(--t-color-text-body)] w-[40%]">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-[var(--t-color-accent)]" />
                                Borrower Label
                              </span>
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-[color:var(--t-color-text-body)] w-[40%]">
                              <span className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-[var(--t-color-success)]" />
                                BDO Label
                              </span>
                            </th>
                            <th className="px-3 py-2 text-xs font-medium text-[color:var(--t-color-text-body)] w-[20%]">Data Path</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.fields.map((field, idx) => {
                            const hasDual = !!field.bdoLabel;
                            return (
                              <tr
                                key={field.fieldId}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}
                                data-testid={`row-comparison-${section.sectionId}-${field.fieldId}`}
                              >
                                <td className="px-3 py-2.5 align-top">
                                  <div className="flex items-start gap-1.5">
                                    {hasDual && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                                    {!hasDual && <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />}
                                    <span className="text-[color:var(--t-color-text-body)]">{field.label}</span>
                                  </div>
                                  {field.conditional && (
                                    <p className="text-[length:var(--t-font-size-sm)] text-amber-600 mt-0.5 ml-3.5">{field.conditional}</p>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 align-top">
                                  {field.bdoLabel ? (
                                    <span className={field.bdoLabel !== field.label ? 'text-[color:var(--t-color-success)] font-medium' : 'text-[color:var(--t-color-text-body)]'}>
                                      {field.bdoLabel}
                                    </span>
                                  ) : (
                                    <span className="text-[color:var(--t-color-primary-pale)] text-xs">&mdash;</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 align-top">
                                  <code className="text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-muted)] font-mono break-all">{field.dataPath}</code>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Theme / CSS Tab */}
        <TabsContent value="theme" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-theme-title">
                Theme / CSS Settings
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Customize the application&apos;s visual appearance. Changes apply globally to all pages after saving.
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-4 pb-2 border-b border-[var(--t-color-border)]">Typography</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font-family">Font Family</Label>
                    <Input
                      id="theme-font-family"
                      value={themeSettings.fontFamily}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fontFamily: e.target.value })}
                      data-testid="input-theme-font-family"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font-size-base">Base Font Size</Label>
                    <Input
                      id="theme-font-size-base"
                      value={themeSettings.fontSizeBase}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fontSizeBase: e.target.value })}
                      data-testid="input-theme-font-size-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font-size-small">Small Font Size</Label>
                    <Input
                      id="theme-font-size-small"
                      value={themeSettings.fontSizeSmall}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fontSizeSmall: e.target.value })}
                      data-testid="input-theme-font-size-small"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font-size-large">Large Font Size</Label>
                    <Input
                      id="theme-font-size-large"
                      value={themeSettings.fontSizeLarge}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fontSizeLarge: e.target.value })}
                      data-testid="input-theme-font-size-large"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font-size-heading">Heading Font Size</Label>
                    <Input
                      id="theme-font-size-heading"
                      value={themeSettings.fontSizeHeading}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fontSizeHeading: e.target.value })}
                      data-testid="input-theme-font-size-heading"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-font-size-section-header">Section Header Font Size</Label>
                    <Input
                      id="theme-font-size-section-header"
                      value={themeSettings.fontSizeSectionHeader}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fontSizeSectionHeader: e.target.value })}
                      data-testid="input-theme-font-size-section-header"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-4 pb-2 border-b border-[var(--t-color-border)]">Layout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-border-radius">Border Radius</Label>
                    <Input
                      id="theme-border-radius"
                      value={themeSettings.borderRadius}
                      onChange={(e) => setThemeSettings({ ...themeSettings, borderRadius: e.target.value })}
                      data-testid="input-theme-border-radius"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-section-px">Section Padding X</Label>
                    <Input
                      id="theme-section-px"
                      value={themeSettings.sectionPaddingX}
                      onChange={(e) => setThemeSettings({ ...themeSettings, sectionPaddingX: e.target.value })}
                      data-testid="input-theme-section-px"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-section-py">Section Padding Y</Label>
                    <Input
                      id="theme-section-py"
                      value={themeSettings.sectionPaddingY}
                      onChange={(e) => setThemeSettings({ ...themeSettings, sectionPaddingY: e.target.value })}
                      data-testid="input-theme-section-py"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-section-mb">Section Margin Bottom</Label>
                    <Input
                      id="theme-section-mb"
                      value={themeSettings.sectionMarginBottom}
                      onChange={(e) => setThemeSettings({ ...themeSettings, sectionMarginBottom: e.target.value })}
                      data-testid="input-theme-section-mb"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-field-spacing">Field Spacing</Label>
                    <Input
                      id="theme-field-spacing"
                      value={themeSettings.fieldSpacing}
                      onChange={(e) => setThemeSettings({ ...themeSettings, fieldSpacing: e.target.value })}
                      data-testid="input-theme-field-spacing"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-input-px">Input Padding X</Label>
                    <Input
                      id="theme-input-px"
                      value={themeSettings.inputPaddingX}
                      onChange={(e) => setThemeSettings({ ...themeSettings, inputPaddingX: e.target.value })}
                      data-testid="input-theme-input-px"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="theme-input-py">Input Padding Y</Label>
                    <Input
                      id="theme-input-py"
                      value={themeSettings.inputPaddingY}
                      onChange={(e) => setThemeSettings({ ...themeSettings, inputPaddingY: e.target.value })}
                      data-testid="input-theme-input-py"
                    />
                  </div>
                </div>
              </div>

              {([
                ['Brand Colors', [
                  ['colorPrimary', 'Primary (Navy)'],
                  ['colorPrimaryLight', 'Primary Light'],
                  ['colorPrimaryLighter', 'Primary Lighter'],
                  ['colorPrimaryPale', 'Primary Pale'],
                  ['colorPrimaryPalest', 'Primary Palest'],
                  ['colorAccent', 'Accent'],
                ]],
                ['Surface Colors', [
                  ['colorPageBg', 'Page Background'],
                  ['colorCardBg', 'Card Background'],
                  ['colorInputBg', 'Input / Field Background'],
                  ['colorHighlightBg', 'Highlight Background'],
                  ['colorHighlightBorder', 'Highlight Border'],
                ]],
                ['Border & Disabled', [
                  ['colorBorder', 'Default Border'],
                  ['colorDisabled', 'Disabled State'],
                ]],
                ['Text Colors', [
                  ['colorTextPrimary', 'Headings / Primary'],
                  ['colorTextBody', 'Body Text'],
                  ['colorTextSecondary', 'Secondary Text'],
                  ['colorTextMuted', 'Muted Text'],
                ]],
                ['Success Colors', [
                  ['colorSuccess', 'Success (Dark)'],
                  ['colorSuccessLight', 'Success (Light)'],
                  ['colorSuccessBg', 'Success Background'],
                  ['colorSuccessText', 'Success Text'],
                  ['colorSuccessBorder', 'Success Border'],
                ]],
                ['Warning Colors', [
                  ['colorWarning', 'Warning (Dark)'],
                  ['colorWarningLight', 'Warning (Light)'],
                  ['colorWarningBg', 'Warning Background'],
                  ['colorWarningText', 'Warning Text'],
                ]],
                ['Danger Colors', [
                  ['colorDanger', 'Danger (Dark)'],
                  ['colorDangerLight', 'Danger (Light)'],
                  ['colorDangerBg', 'Danger Background'],
                  ['colorDangerText', 'Danger Text'],
                ]],
                ['Info Colors', [
                  ['colorInfoBg', 'Info Background'],
                  ['colorInfoBorder', 'Info Border'],
                  ['colorInfoText', 'Info Text'],
                ]],
                ['Special Colors', [
                  ['colorPurple', 'Purple'],
                  ['colorOrange', 'Orange'],
                ]],
              ] as [string, [keyof ThemeSettings, string][]][]).map(([sectionTitle, fields]) => (
                <div key={sectionTitle}>
                  <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-4 pb-2 border-b border-[var(--t-color-border)]">{sectionTitle}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fields.map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <Label htmlFor={`theme-${key}`}>{label}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={themeSettings[key]}
                            onChange={(e) => setThemeSettings({ ...themeSettings, [key]: e.target.value })}
                            className="w-9 h-9 rounded-md border border-[var(--t-color-border)] cursor-pointer p-0.5"
                            data-testid={`color-theme-${key}`}
                          />
                          <Input
                            id={`theme-${key}`}
                            value={themeSettings[key]}
                            onChange={(e) => setThemeSettings({ ...themeSettings, [key]: e.target.value })}
                            className="flex-1"
                            data-testid={`input-theme-${key}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-[var(--t-color-border)]">
                <button
                  onClick={() => resetTheme()}
                  className="px-4 py-2 text-[length:var(--t-font-size-base)] rounded-md border border-[var(--t-color-border)] text-[color:var(--t-color-text-secondary)] hover:bg-[var(--t-color-page-bg)]"
                  data-testid="button-reset-theme-defaults"
                >
                  Reset to Defaults
                </button>
              </div>

              <div className="p-4 rounded-md border border-[var(--t-color-border)] bg-[var(--t-color-page-bg)]">
                <h4 className="text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)] mb-3">Preview</h4>
                <div className="space-y-3" style={{ fontFamily: themeSettings.fontFamily + ', sans-serif' }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="font-semibold uppercase tracking-wider"
                      style={{ fontSize: themeSettings.fontSizeHeading, color: themeSettings.colorTextPrimary }}
                    >
                      Heading Text
                    </span>
                  </div>
                  <p style={{ fontSize: themeSettings.fontSizeLarge, color: themeSettings.colorTextBody }}>
                    Large body text sample
                  </p>
                  <p style={{ fontSize: themeSettings.fontSizeBase, color: themeSettings.colorTextBody }}>
                    Base body text sample &mdash; this is the default size used across most of the application.
                  </p>
                  <p style={{ fontSize: themeSettings.fontSizeSmall, color: themeSettings.colorTextSecondary }}>
                    Small secondary text sample
                  </p>
                  <p style={{ fontSize: themeSettings.fontSizeSmall, color: themeSettings.colorTextMuted }}>
                    Small muted text sample
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="px-3 py-1 rounded-md text-white text-[length:var(--t-font-size-sm)] font-medium" style={{ backgroundColor: themeSettings.colorPrimary, borderRadius: themeSettings.borderRadius }}>Primary</span>
                    <span className="px-3 py-1 rounded-md text-white text-[length:var(--t-font-size-sm)] font-medium" style={{ backgroundColor: themeSettings.colorPrimaryLight, borderRadius: themeSettings.borderRadius }}>Light</span>
                    <span className="px-3 py-1 rounded-md text-[length:var(--t-font-size-sm)] font-medium" style={{ backgroundColor: themeSettings.colorPrimaryPalest, color: themeSettings.colorPrimary, borderRadius: themeSettings.borderRadius }}>Palest</span>
                    <span className="px-3 py-1 rounded-md text-white text-[length:var(--t-font-size-sm)] font-medium" style={{ backgroundColor: themeSettings.colorSuccess, borderRadius: themeSettings.borderRadius }}>Success</span>
                    <span className="px-3 py-1 rounded-md text-white text-[length:var(--t-font-size-sm)] font-medium" style={{ backgroundColor: themeSettings.colorWarning, borderRadius: themeSettings.borderRadius }}>Warning</span>
                    <span className="px-3 py-1 rounded-md text-white text-[length:var(--t-font-size-sm)] font-medium" style={{ backgroundColor: themeSettings.colorDanger, borderRadius: themeSettings.borderRadius }}>Danger</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: themeSettings.colorPageBg, borderColor: themeSettings.colorBorder }} title="Page BG" />
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: themeSettings.colorCardBg, borderColor: themeSettings.colorBorder }} title="Card BG" />
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: themeSettings.colorBorder, borderColor: themeSettings.colorBorder }} title="Border" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Add User Modal */}
        <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
          <DialogContent className="max-w-md" data-testid="dialog-add-user">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-first-name">First Name</Label>
                  <Input
                    id="user-first-name"
                    value={newUserForm.firstName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                    data-testid="input-user-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="user-last-name">Last Name</Label>
                  <Input
                    id="user-last-name"
                    value={newUserForm.lastName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                    data-testid="input-user-last-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="user-email">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                  data-testid="input-user-email"
                />
              </div>

              <div>
                <Label htmlFor="user-phone">Phone</Label>
                <Input
                  id="user-phone"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  data-testid="input-user-phone"
                />
              </div>

              <div>
                <Label htmlFor="user-role">Role *</Label>
                <p className="text-xs text-[color:var(--t-color-text-muted)] mb-1">Controls the user's permissions in the system</p>
                <Select
                  value={newUserForm.role}
                  onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
                >
                  <SelectTrigger id="user-role" data-testid="select-user-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BDO">BDO</SelectItem>
                    <SelectItem value="BDO Manager">BDO Manager</SelectItem>
                    <SelectItem value="Credit Executive">Credit Executive</SelectItem>
                    <SelectItem value="BDA">BDA</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUserModalOpen(false)} data-testid="button-cancel-add-user">
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={isAddingUser || !newUserForm.email || !newUserForm.role}
                data-testid="button-submit-add-user"
              >
                {isAddingUser ? 'Adding...' : 'Add User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fee Configuration Modal */}
        <Dialog open={feeConfigModalOpen} onOpenChange={setFeeConfigModalOpen}>
          <DialogContent className="max-w-md" data-testid="dialog-fee-config">
            <DialogHeader>
              <DialogTitle>
                {editingFeeConfig ? 'Edit Fee Configuration' : 'Add Fee Configuration'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="fee-name">Fee Name *</Label>
                <Select
                  value={feeConfigForm.feeName}
                  onValueChange={(value) => setFeeConfigForm({ ...feeConfigForm, feeName: value as FeeNameType })}
                >
                  <SelectTrigger id="fee-name" data-testid="select-fee-name">
                    <SelectValue placeholder="Select a fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_NAME_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fee-amount">Amount *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="fee-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeConfigForm.amount || ''}
                    onChange={(e) => setFeeConfigForm({ ...feeConfigForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    data-testid="input-fee-amount"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fee-includes-real-estate">Condition: Includes Real Estate? *</Label>
                <Select
                  value={feeConfigForm.includesRealEstate ? 'yes' : 'no'}
                  onValueChange={(value) => setFeeConfigForm({ ...feeConfigForm, includesRealEstate: value === 'yes' })}
                >
                  <SelectTrigger id="fee-includes-real-estate" data-testid="select-fee-includes-real-estate">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fee-description">Description</Label>
                <Input
                  id="fee-description"
                  value={feeConfigForm.description}
                  onChange={(e) => setFeeConfigForm({ ...feeConfigForm, description: e.target.value })}
                  placeholder="Optional description"
                  data-testid="input-fee-description"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="fee-active">Active</Label>
                <Switch
                  id="fee-active"
                  checked={feeConfigForm.active}
                  onCheckedChange={(checked) => setFeeConfigForm({ ...feeConfigForm, active: checked })}
                  data-testid="switch-fee-active"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setFeeConfigModalOpen(false);
                  setEditingFeeConfig(null);
                  setFeeConfigForm(emptyFeeConfigurationForm);
                }}
                data-testid="button-cancel-fee-config"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFeeConfigSubmit}
                disabled={!feeConfigForm.feeName || feeConfigForm.amount <= 0}
                data-testid="button-submit-fee-config"
              >
                {editingFeeConfig ? 'Update' : 'Add'} Fee Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
    </BDOLayout>
  );
}
