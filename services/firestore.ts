// Client-side service layer
// Calls Next.js API routes which handle Cosmos DB operations server-side.

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

// ============ HELPERS ============

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ============ PROJECT OPERATIONS ============

export const createProject = async (projectData: Omit<Project, 'id'>): Promise<string> => {
  const result = await apiFetch<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
  return result.id;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    return await apiFetch<Project>(`/api/projects/${projectId}`);
  } catch {
    return null;
  }
};

export const getUserProjects = async (userId: string, options?: { includeDeleted?: boolean; maxRecords?: number }): Promise<Project[]> => {
  const params = new URLSearchParams({ userId });
  if (options?.includeDeleted) params.set('includeDeleted', 'true');
  if (options?.maxRecords) params.set('limit', options.maxRecords.toString());
  return apiFetch<Project[]>(`/api/projects?${params}`);
};

export const getAllProjects = async (options?: { includeDeleted?: boolean; maxRecords?: number }): Promise<Project[]> => {
  const params = new URLSearchParams();
  if (options?.includeDeleted) params.set('includeDeleted', 'true');
  if (options?.maxRecords) params.set('limit', options.maxRecords.toString());
  return apiFetch<Project[]>(`/api/projects?${params}`);
};

export const getProjectsByStage = async (stage: string, maxRecords: number = 100): Promise<Project[]> => {
  const params = new URLSearchParams({ stage, limit: maxRecords.toString() });
  return apiFetch<Project[]>(`/api/projects?${params}`);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  await apiFetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteProject = async (projectId: string, deletedByUserId?: string): Promise<void> => {
  await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
};

export const restoreProject = async (projectId: string): Promise<void> => {
  await apiFetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify({ deletedAt: null, deletedBy: null }),
  });
};

// ============ LOAN OPERATIONS (stubs — not yet API-backed) ============

export const createLoan = async (loanData: Omit<Loan, 'id'>): Promise<string> => '';
export const getLoan = async (loanId: string): Promise<Loan | null> => null;
export const getProjectLoans = async (projectId: string): Promise<Loan[]> => [];
export const updateLoan = async (loanId: string, updates: Partial<Loan>): Promise<void> => {};

// ============ FUNDING STRUCTURE (stubs) ============

export const createFundingStructure = async (data: Omit<FundingStructure, 'id'>): Promise<string> => '';
export const getProjectFundingStructures = async (projectId: string): Promise<FundingStructure[]> => [];
export const updateFundingStructure = async (id: string, updates: Partial<FundingStructure>): Promise<void> => {};

// ============ DOCUMENT OPERATIONS (stubs) ============

export const createDocument = async (data: Omit<Document, 'id'>): Promise<string> => '';
export const getProjectDocuments = async (projectId: string): Promise<Document[]> => [];
export const updateDocument = async (id: string, updates: Partial<Document>): Promise<void> => {};

// ============ BUSINESS ENTITY (stubs) ============

export const createBusinessEntity = async (data: Omit<BusinessEntity, 'id'>): Promise<string> => '';
export const getProjectBusinessEntities = async (projectId: string): Promise<BusinessEntity[]> => [];

// ============ LOAN APPLICATION DATA ============

export const saveLoanApplication = async (projectId: string, applicationData: ApplicationData): Promise<void> => {
  await apiFetch(`/api/projects/${projectId}/loan-application`, {
    method: 'PUT',
    body: JSON.stringify(applicationData),
  });
};

export const getLoanApplication = async (projectId: string): Promise<ApplicationData | null> => {
  try {
    const result = await apiFetch<ApplicationData | null>(`/api/projects/${projectId}/loan-application`);
    return result;
  } catch {
    return null;
  }
};

export const updateLoanApplication = async (projectId: string, updates: Partial<ApplicationData>): Promise<void> => {
  const existing = await getLoanApplication(projectId);
  if (existing) {
    await saveLoanApplication(projectId, { ...existing, ...updates });
  } else {
    await saveLoanApplication(projectId, updates as ApplicationData);
  }
};

// ============ NOTES ============

export const createNote = async (noteData: Omit<Note, 'id'>): Promise<string> => {
  const result = await apiFetch<Note>(`/api/projects/${noteData.projectId}/notes`, {
    method: 'POST',
    body: JSON.stringify(noteData),
  });
  return result.id;
};

export const getProjectNotes = async (projectId: string): Promise<Note[]> => {
  return apiFetch<Note[]>(`/api/projects/${projectId}/notes`);
};

export const updateNote = async (noteId: string, updates: Partial<Note>): Promise<void> => {
  // TODO: Add PUT /api/notes/:id route when needed
  console.warn('updateNote not yet API-backed');
};

export const deleteNote = async (noteId: string): Promise<void> => {
  // TODO: Add DELETE /api/notes/:id route when needed
  console.warn('deleteNote not yet API-backed');
};

export const getNoteTags = async (): Promise<string[]> => ['General', 'Credit', 'Underwriting', 'Follow-up'];
export const saveNoteTags = async (tags: string[]): Promise<void> => {};

// ============ FILE UPLOAD INSTRUCTIONS ============

export const getFileUploadInstructions = async (): Promise<FileUploadInstructions> => ({
  businessApplicant: 'Upload business tax returns, financial statements, and legal documents.',
  individualApplicants: 'Upload personal tax returns and financial statements for each applicant.',
  otherBusinesses: 'Upload tax returns and financials for other owned businesses.',
  projectFiles: 'Upload appraisals, environmental reports, and other project-specific documents.',
});

// ============ SPREADS WORKBOOK ============

export const setSpreadsWorkbook = async (projectId: string, workbook: SpreadsWorkbook): Promise<void> => {
  await updateProject(projectId, { spreadsWorkbooks: [workbook] } as any);
};

export const migrateLegacySpreadsWorkbook = async (projectId: string, project: Project): Promise<boolean> => {
  if (project.spreadsWorkbook && (!project.spreadsWorkbooks || project.spreadsWorkbooks.length === 0)) {
    await updateProject(projectId, {
      spreadsWorkbooks: [project.spreadsWorkbook],
    } as any);
    return true;
  }
  return false;
};

export const addSpreadsWorkbook = async (projectId: string, workbook: SpreadsWorkbook): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) return;
  const workbooks = [...(project.spreadsWorkbooks || []), workbook];
  await updateProject(projectId, { spreadsWorkbooks: workbooks });
};

export const removeSpreadsWorkbook = async (projectId: string, workbookId: string): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) return;
  const workbooks = (project.spreadsWorkbooks || []).filter(w => w.workbookId !== workbookId);
  await updateProject(projectId, { spreadsWorkbooks: workbooks });
};

export const updateSpreadsWorkbookLabel = async (projectId: string, workbookId: string, label: string): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) return;
  const workbooks = (project.spreadsWorkbooks || []).map(w =>
    w.workbookId === workbookId ? { ...w, label } : w
  );
  await updateProject(projectId, { spreadsWorkbooks: workbooks });
};

export const updateSpreadsWorkbookSyncTimestamp = async (projectId: string, workbookId: string): Promise<void> => {
  const project = await getProject(projectId);
  if (!project) return;
  const workbooks = (project.spreadsWorkbooks || []).map(w =>
    w.workbookId === workbookId ? { ...w, lastSyncedAt: new Date() } : w
  );
  await updateProject(projectId, { spreadsWorkbooks: workbooks });
};

// ============ PDF IMPORT SESSIONS (stubs) ============

export const createPdfImportSession = async (sessionData: Omit<PdfImportSession, 'id'>): Promise<string> => '';
export const getPdfImportSession = async (sessionId: string): Promise<PdfImportSession | null> => null;
export const getPdfImportSessions = async (projectId: string): Promise<PdfImportSession[]> => [];
export const updatePdfImportSession = async (sessionId: string, updates: Partial<PdfImportSession>): Promise<void> => {};
export const deletePdfImportSession = async (sessionId: string): Promise<void> => {};

// ============ PDF TEMPLATES (stubs) ============

export const createPdfTemplate = async (templateData: Omit<PdfMappingTemplate, 'id'>): Promise<string> => '';
export const getPdfTemplate = async (templateId: string): Promise<PdfMappingTemplate | null> => null;
export const getPdfTemplates = async (): Promise<PdfMappingTemplate[]> => [];
export const deletePdfTemplate = async (templateId: string): Promise<void> => {};

// ============ SOURCES & USES ============

export const getProjectSourcesUses = async (projectId: string, workbookId: string): Promise<ProjectSourcesUses | null> => {
  // TODO: Add API route for sources & uses
  return null;
};

export const saveProjectSourcesUses = async (projectId: string, workbookId: string, data: ProjectSourcesUses): Promise<void> => {
  // TODO: Add API route for sources & uses
};

// ============ PRIMARY SPREAD ============

export const setPrimarySpreadId = async (projectId: string, workbookId: string): Promise<void> => {
  await updateProject(projectId, { primarySpreadId: workbookId });
};

export const getPrimarySpreadId = async (projectId: string): Promise<string | null> => {
  const project = await getProject(projectId);
  return project?.primarySpreadId || null;
};

// ============ GENERATED FORMS ============

// Static form templates served from /pdfs/
const FORM_TEMPLATES = [
  { id: 'blank-individual-applicant', formName: 'Blanks - Individual Applicant', fileName: 'Blanks_Individual_Applicant.pdf' },
  { id: 'blank-business-applicant', formName: 'Blank - Business Applicant / Project Information', fileName: 'blank_Business_Applicant_Project_Information.pdf' },
  { id: 'blank-business-questionnaire', formName: 'Blanks - Business Questionnaire', fileName: 'Blanks_Business_Questionnaire.pdf' },
  { id: 'individual-pfi-worksheet', formName: 'Individual Applicant - Personal Financial Information', fileName: 'Individual_Applicant_Personal_Financial_Information 6.xlsx' },
];

export const getGeneratedForms = async (_projectId: string): Promise<GeneratedForm[]> => {
  return FORM_TEMPLATES.map(t => ({
    id: t.id,
    projectId: _projectId,
    formName: t.formName,
    status: 'pending' as const,
    generatedAt: new Date(),
  }));
};

export const generateFormsForProject = async (projectId: string): Promise<GeneratedForm[]> => {
  return getGeneratedForms(projectId);
};

export const deleteGeneratedForm = async (_formId: string): Promise<void> => {};
export const getGeneratedFormById = async (formId: string): Promise<GeneratedForm | null> => {
  const template = FORM_TEMPLATES.find(t => t.id === formId);
  if (!template) return null;
  return { id: template.id, projectId: '', formName: template.formName, status: 'pending', generatedAt: new Date() };
};
export const updateGeneratedFormStatus = async (_formId: string, _status: GeneratedForm['status'], _timestampField?: 'downloadedAt' | 'uploadedAt' | 'importedAt'): Promise<void> => {};

// ============ FORM PORTAL TOKENS (stubs — TODO: API routes) ============

export const createFormPortalToken = async (projectId: string, createdBy: string, createdByName: string, expirationDays?: number): Promise<string> => '';
export const getFormPortalToken = async (token: string): Promise<FormPortalToken | null> => null;
export const validateFormPortalToken = async (token: string): Promise<{ valid: boolean; token?: FormPortalToken; error?: string }> => ({ valid: false, error: 'Not implemented' });
export const revokeFormPortalToken = async (token: string): Promise<void> => {};
export const getProjectFormPortalToken = async (projectId: string): Promise<string | null> => null;

// ============ BORROWER UPLOADS (stubs — TODO: API routes) ============

export const createBorrowerUpload = async (uploadData: Omit<BorrowerUpload, 'id'>): Promise<string> => '';
export const getBorrowerUploads = async (projectId: string): Promise<BorrowerUpload[]> => [];
export const markFormAsDownloaded = async (formId: string): Promise<void> => {};
export const updateBorrowerUpload = async (projectId: string, uploadId: string, updates: Partial<BorrowerUpload>): Promise<void> => {};
export const getBorrowerUpload = async (projectId: string, uploadId: string): Promise<BorrowerUpload | null> => null;
