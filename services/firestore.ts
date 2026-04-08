// In-memory dev store for project data
// Persists within a browser session only. Will be replaced with Azure Cosmos DB.

import { Project, Loan, FundingStructure, Document, BusinessEntity, Note, SpreadsWorkbook, PdfImportSession, PdfMappingTemplate, PdfFieldMapping, FormPortalToken, BorrowerUpload } from '@/types';
import type { ApplicationData } from '@/lib/applicationStore';
import type { ProjectSourcesUses } from '@/lib/schema';

// ============ EXPORTED INTERFACES ============

export interface FileUploadInstructions {
  businessApplicant: string;
  individualApplicants: string;
  otherBusinesses: string;
  projectFiles: string;
}

export interface GeneratedForm {
  id: string;
  projectId: string;
  formName: string;
  status: 'pending' | 'downloaded' | 'uploaded' | 'imported' | 'error';
  generatedAt: Date;
  downloadedAt?: Date;
  uploadedAt?: Date;
  importedAt?: Date;
  fileUrl?: string;
}

// ============ IN-MEMORY STORES ============

const projectStore = new Map<string, Project>();
const loanAppStore = new Map<string, ApplicationData>();
const noteStore = new Map<string, Note>();

// Seed with test projects
const TEST_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    projectName: 'Riverdale Restaurant Group',
    businessName: 'Riverdale Restaurant Group LLC',
    stage: 'Leads',
    status: 'Active',
    bdoUserId: 'dev-srachal',
    bdoUserName: 'Shane Rachal',
    createdAt: new Date('2025-03-15'),
    updatedAt: new Date('2025-04-01'),
    loanAmount: 1500000,
    businessType: 'Full-Service Restaurant',
    location: 'Dallas, TX',
  },
  {
    id: 'proj-002',
    projectName: 'Summit Medical Partners',
    businessName: 'Summit Medical Partners Inc',
    stage: 'PQ Advance',
    status: 'Active',
    bdoUserId: 'dev-srachal',
    bdoUserName: 'Shane Rachal',
    createdAt: new Date('2025-02-20'),
    updatedAt: new Date('2025-03-28'),
    loanAmount: 3200000,
    businessType: 'Medical Practice',
    location: 'Houston, TX',
  },
  {
    id: 'proj-003',
    projectName: 'Heritage Auto Body',
    businessName: 'Heritage Auto Body & Paint',
    stage: 'PQ Prep',
    status: 'Active',
    bdoUserId: 'dev-srachal',
    bdoUserName: 'Shane Rachal',
    createdAt: new Date('2025-04-02'),
    updatedAt: new Date('2025-04-05'),
    loanAmount: 750000,
    businessType: 'Auto Body Repair',
    location: 'Austin, TX',
  },
];

// Initialize store
TEST_PROJECTS.forEach(p => projectStore.set(p.id, p));

let nextId = 100;
const genId = (prefix: string) => `${prefix}-${Date.now()}-${nextId++}`;

// ============ PROJECT OPERATIONS ============

export const createProject = async (projectData: Omit<Project, 'id'>): Promise<string> => {
  const id = genId('proj');
  const project: Project = { ...projectData, id };
  projectStore.set(id, project);
  console.info(`[dev store] createProject ${id}: ${project.projectName}`);
  return id;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  return projectStore.get(projectId) ?? null;
};

export const getUserProjects = async (userId: string, options?: { includeDeleted?: boolean; maxRecords?: number }): Promise<Project[]> => {
  let projects = Array.from(projectStore.values()).filter(p => p.bdoUserId === userId);
  if (!options?.includeDeleted) {
    projects = projects.filter(p => !p.deletedAt);
  }
  projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  if (options?.maxRecords) projects = projects.slice(0, options.maxRecords);
  return projects;
};

export const getAllProjects = async (options?: { includeDeleted?: boolean; maxRecords?: number }): Promise<Project[]> => {
  let projects = Array.from(projectStore.values());
  if (!options?.includeDeleted) {
    projects = projects.filter(p => !p.deletedAt);
  }
  projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  if (options?.maxRecords) projects = projects.slice(0, options.maxRecords);
  return projects;
};

export const getProjectsByStage = async (stage: string, maxRecords: number = 100): Promise<Project[]> => {
  return Array.from(projectStore.values())
    .filter(p => p.stage === stage && !p.deletedAt)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, maxRecords);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  const existing = projectStore.get(projectId);
  if (existing) {
    projectStore.set(projectId, { ...existing, ...updates, updatedAt: new Date() });
    console.info(`[dev store] updateProject ${projectId}`);
  }
};

export const deleteProject = async (projectId: string, deletedByUserId?: string): Promise<void> => {
  const existing = projectStore.get(projectId);
  if (existing) {
    projectStore.set(projectId, { ...existing, deletedAt: new Date(), deletedBy: deletedByUserId || null });
    console.info(`[dev store] deleteProject ${projectId}`);
  }
};

export const restoreProject = async (projectId: string): Promise<void> => {
  const existing = projectStore.get(projectId);
  if (existing) {
    projectStore.set(projectId, { ...existing, deletedAt: null, deletedBy: null });
    console.info(`[dev store] restoreProject ${projectId}`);
  }
};

// ============ LOAN OPERATIONS ============

export const createLoan = async (loanData: Omit<Loan, 'id'>): Promise<string> => {
  const id = genId('loan');
  console.info(`[dev store] createLoan ${id}`);
  return id;
};

export const getLoan = async (loanId: string): Promise<Loan | null> => null;
export const getProjectLoans = async (projectId: string): Promise<Loan[]> => [];
export const updateLoan = async (loanId: string, updates: Partial<Loan>): Promise<void> => {};

// ============ FUNDING STRUCTURE OPERATIONS ============

export const createFundingStructure = async (fundingStructureData: Omit<FundingStructure, 'id'>): Promise<string> => genId('fs');
export const getProjectFundingStructures = async (projectId: string): Promise<FundingStructure[]> => [];
export const updateFundingStructure = async (fundingStructureId: string, updates: Partial<FundingStructure>): Promise<void> => {};

// ============ DOCUMENT OPERATIONS ============

export const createDocument = async (documentData: Omit<Document, 'id'>): Promise<string> => genId('doc');
export const getProjectDocuments = async (projectId: string): Promise<Document[]> => [];
export const updateDocument = async (documentId: string, updates: Partial<Document>): Promise<void> => {};

// ============ BUSINESS ENTITY OPERATIONS ============

export const createBusinessEntity = async (businessEntityData: Omit<BusinessEntity, 'id'>): Promise<string> => genId('be');
export const getProjectBusinessEntities = async (projectId: string): Promise<BusinessEntity[]> => [];

// ============ LOAN APPLICATION OPERATIONS ============

export const saveLoanApplication = async (projectId: string, applicationData: ApplicationData): Promise<void> => {
  loanAppStore.set(projectId, applicationData);
  console.info(`[dev store] saveLoanApplication ${projectId}`);
};

export const getLoanApplication = async (projectId: string): Promise<ApplicationData | null> => {
  return loanAppStore.get(projectId) ?? null;
};

export const updateLoanApplication = async (projectId: string, updates: Partial<ApplicationData>): Promise<void> => {
  const existing = loanAppStore.get(projectId);
  if (existing) {
    loanAppStore.set(projectId, { ...existing, ...updates });
  }
};

// ============ NOTE OPERATIONS ============

export const createNote = async (noteData: Omit<Note, 'id'>): Promise<string> => {
  const id = genId('note');
  noteStore.set(id, { ...noteData, id } as Note);
  return id;
};
export const getProjectNotes = async (projectId: string): Promise<Note[]> => {
  return Array.from(noteStore.values()).filter(n => n.projectId === projectId);
};
export const updateNote = async (noteId: string, updates: Partial<Note>): Promise<void> => {
  const existing = noteStore.get(noteId);
  if (existing) noteStore.set(noteId, { ...existing, ...updates });
};
export const deleteNote = async (noteId: string): Promise<void> => { noteStore.delete(noteId); };
export const getNoteTags = async (): Promise<string[]> => ['General', 'Credit', 'Underwriting', 'Follow-up'];
export const saveNoteTags = async (tags: string[]): Promise<void> => {};

// ============ FILE UPLOAD INSTRUCTIONS ============

export const getFileUploadInstructions = async (): Promise<FileUploadInstructions> => ({
  businessApplicant: 'Upload tax returns, P&L statements, balance sheets, articles of incorporation, and other business documents.',
  individualApplicants: 'Upload personal tax returns, personal financial statements, driver\'s license, and other personal documents for all applicants.',
  otherBusinesses: 'Upload tax returns, financial statements, and organizational documents for any other businesses owned by the applicants.',
  projectFiles: 'Upload purchase agreements, appraisals, construction plans, lease agreements, and other project-related documents.',
});

// ============ SPREADS WORKBOOK OPERATIONS ============

export const setSpreadsWorkbook = async (projectId: string, workbook: SpreadsWorkbook): Promise<void> => {};
export const migrateLegacySpreadsWorkbook = async (projectId: string, project: Project): Promise<boolean> => false;
export const addSpreadsWorkbook = async (projectId: string, workbook: SpreadsWorkbook): Promise<void> => {};
export const removeSpreadsWorkbook = async (projectId: string, workbookId: string): Promise<void> => {};
export const updateSpreadsWorkbookLabel = async (projectId: string, workbookId: string, label: string): Promise<void> => {};
export const updateSpreadsWorkbookSyncTimestamp = async (projectId: string, workbookId: string): Promise<void> => {};

// ============ PDF IMPORT SESSION OPERATIONS ============

export const createPdfImportSession = async (sessionData: Omit<PdfImportSession, 'id'>): Promise<string> => genId('pdfimport');
export const getPdfImportSession = async (sessionId: string): Promise<PdfImportSession | null> => null;
export const getPdfImportSessions = async (projectId: string): Promise<PdfImportSession[]> => [];
export const updatePdfImportSession = async (sessionId: string, updates: Partial<PdfImportSession>): Promise<void> => {};
export const deletePdfImportSession = async (sessionId: string): Promise<void> => {};

// ============ PDF TEMPLATE OPERATIONS ============

export const createPdfTemplate = async (templateData: Omit<PdfMappingTemplate, 'id'>): Promise<string> => genId('pdftpl');
export const getPdfTemplate = async (templateId: string): Promise<PdfMappingTemplate | null> => null;
export const getPdfTemplates = async (): Promise<PdfMappingTemplate[]> => [];
export const deletePdfTemplate = async (templateId: string): Promise<void> => {};

// ============ SOURCES & USES OPERATIONS ============

export const getProjectSourcesUses = async (projectId: string, workbookId: string): Promise<ProjectSourcesUses | null> => null;
export const saveProjectSourcesUses = async (projectId: string, workbookId: string, data: ProjectSourcesUses): Promise<void> => {};

// ============ PRIMARY SPREAD OPERATIONS ============

export const setPrimarySpreadId = async (projectId: string, workbookId: string): Promise<void> => {};
export const getPrimarySpreadId = async (projectId: string): Promise<string | null> => null;

// ============ GENERATED FORMS OPERATIONS ============

export const getGeneratedForms = async (projectId: string): Promise<GeneratedForm[]> => [];
export const generateFormsForProject = async (projectId: string): Promise<GeneratedForm[]> => [];
export const deleteGeneratedForm = async (formId: string): Promise<void> => {};
export const getGeneratedFormById = async (formId: string): Promise<GeneratedForm | null> => null;
export const updateGeneratedFormStatus = async (formId: string, status: GeneratedForm['status'], timestampField?: 'downloadedAt' | 'uploadedAt' | 'importedAt'): Promise<void> => {};

// ============ FORM PORTAL TOKEN OPERATIONS ============

export const createFormPortalToken = async (projectId: string, createdBy: string, createdByName: string, expirationDays: number = 30): Promise<string> => genId('token');
export const getFormPortalToken = async (token: string): Promise<FormPortalToken | null> => null;
export const validateFormPortalToken = async (token: string): Promise<{ valid: boolean; token?: FormPortalToken; error?: string }> => ({ valid: false, error: 'Not implemented' });
export const revokeFormPortalToken = async (token: string): Promise<void> => {};
export const getProjectFormPortalToken = async (projectId: string): Promise<string | null> => null;

// ============ BORROWER UPLOAD OPERATIONS ============

export const createBorrowerUpload = async (uploadData: Omit<BorrowerUpload, 'id'>): Promise<string> => genId('upload');
export const getBorrowerUploads = async (projectId: string): Promise<BorrowerUpload[]> => [];
export const markFormAsDownloaded = async (formId: string): Promise<void> => {};
export const updateBorrowerUpload = async (projectId: string, uploadId: string, updates: Partial<BorrowerUpload>): Promise<void> => {};
export const getBorrowerUpload = async (projectId: string, uploadId: string): Promise<BorrowerUpload | null> => null;
