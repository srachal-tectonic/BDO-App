'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  ExternalLink,
  FileDown,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/lib/applicationStore';
import { getAdminSettings, getProject, updateProject } from '@/services/firestore';
import { authenticatedFormPost, authenticatedGet } from '@/lib/authenticatedFetch';
import { generateQuestionnairePdf, type QuestionnaireRule, type QuestionnaireResponse } from '@/lib/questionnairePdf';

// SharePoint subfolder that holds files uploaded via "Add Additional Materials".
const ADDITIONAL_MATERIALS_FOLDER = 'Additional Materials';

interface AdditionalMaterialFile {
  id: string;
  name: string;
  webUrl?: string;
}

// Recursively locate the "Additional Materials" subfolder in a SharePoint file
// tree and return its file children.
function findAdditionalMaterials(items: any[]): AdditionalMaterialFile[] {
  for (const it of items || []) {
    if (it?.type === 'folder' && String(it.name).toLowerCase() === ADDITIONAL_MATERIALS_FOLDER.toLowerCase()) {
      return (it.children || [])
        .filter((c: any) => c?.type === 'file')
        .map((c: any) => ({ id: c.id, name: c.name, webUrl: c.webUrl }));
    }
    if (Array.isArray(it?.children)) {
      const found = findAdditionalMaterials(it.children);
      if (found.length) return found;
    }
  }
  return [];
}

async function fetchLogoBytes(): Promise<Uint8Array | null> {
  try {
    const res = await fetch('/images/TBank-logo.png');
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}
import type { Project } from '@/types';

function normalizePurpose(value: unknown): string {
  // Strip *all* whitespace so legacy spellings like "Start up" still match the
  // canonical "Startup" option emitted by the Project Purpose dropdown.
  return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}

function purposeMatches(key: string, purposes: string[]): boolean {
  const k = normalizePurpose(key);
  if (!k) return false;
  return purposes.some((p) => normalizePurpose(p) === k);
}

function filterRuleByProject(rule: QuestionnaireRule & { purposeKeys?: string[] }, po: any): boolean {
  if (!rule.enabled) return false;

  const cat = rule.mainCategory;
  if (cat === 'Business Overview') return true;

  if (cat === 'Project Purpose') {
    const keys = rule.purposeKeys && rule.purposeKeys.length > 0
      ? rule.purposeKeys
      : (rule.purposeKey ? [rule.purposeKey] : []);
    if (keys.length === 0) return true;

    const primaryRaw = po?.primaryProjectPurpose;
    const primary: string[] = Array.isArray(primaryRaw) ? primaryRaw : (primaryRaw ? [primaryRaw] : []);
    const secondary: string[] = Array.isArray(po?.secondaryProjectPurposes) ? po.secondaryProjectPurposes : [];
    const allPurposes = [...primary, ...secondary].filter(Boolean);
    if (allPurposes.length === 0) return true;

    return keys.some((k) => purposeMatches(k, allPurposes));
  }

  if (cat === 'Industry') {
    if (!rule.naicsCodes || rule.naicsCodes.length === 0) return true;
    const projectNaics = po?.naicsCode;
    if (!projectNaics || projectNaics.trim() === '') return false;
    return rule.naicsCodes.some((code) => {
      if (!code || code.trim() === '') return false;
      return projectNaics.startsWith(code) || code.startsWith(projectNaics);
    });
  }

  return false;
}

interface PurposeBlock {
  purposeName: string;
  rules: QuestionnaireRule[];
}

function groupRulesByPurpose(
  rules: QuestionnaireRule[],
  primaryPurpose: string,
  secondaryPurposes: string[],
): PurposeBlock[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const p of [primaryPurpose, ...secondaryPurposes]) {
    if (!p) continue;
    const norm = normalizePurpose(p);
    if (seen.has(norm)) continue;
    seen.add(norm);
    ordered.push(p);
  }
  const blocks: PurposeBlock[] = [];
  const general: QuestionnaireRule[] = [];
  const byPurpose = new Map<string, QuestionnaireRule[]>();

  for (const rule of rules) {
    const key = rule.purposeKey?.trim();
    if (!key) {
      general.push(rule);
      continue;
    }
    const matched = ordered.find((p) => normalizePurpose(p) === normalizePurpose(key));
    const label = matched || key;
    if (!byPurpose.has(label)) byPurpose.set(label, []);
    byPurpose.get(label)!.push(rule);
  }

  if (general.length > 0) blocks.push({ purposeName: '', rules: general });
  for (const label of ordered) {
    const list = byPurpose.get(label);
    if (list && list.length > 0) blocks.push({ purposeName: label, rules: list });
  }
  for (const [label, list] of byPurpose.entries()) {
    if (!ordered.some((p) => normalizePurpose(p) === normalizePurpose(label))) {
      blocks.push({ purposeName: label, rules: list });
    }
  }

  return blocks;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

interface BusinessQuestionnaireSectionProps {
  editable?: boolean;
  showExport?: boolean;
  /**
   * `fillable` (default) — generate the PDF client-side via `pdf-lib` with
   *   editable form fields. Matches the Loan Application tab's export.
   * `readonly`  — fetch the read-only PDF rendered by the PQ Memo route
   *   (`/api/projects/<id>/pq-memo-pdf?section=business-questionnaire`), so the
   *   output matches the styling of the full Pre-Qual export.
   */
  exportMode?: 'fillable' | 'readonly';
}

export default function BusinessQuestionnaireSection({ editable = false, showExport = false, exportMode = 'fillable' }: BusinessQuestionnaireSectionProps = {}) {
  const { data: appData } = useApplication();
  const projectId = appData.projectId;
  const po = appData.projectOverview;

  const [rules, setRules] = useState<QuestionnaireRule[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // "Additional Materials" — uploaded to the project's SharePoint folder and
  // listed at the top of the read-only (PQ Memo / PreQual) questionnaire view.
  const [materials, setMaterials] = useState<AdditionalMaterialFile[]>([]);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const materialsInputRef = useRef<HTMLInputElement>(null);

  const loadMaterials = useCallback(async () => {
    if (!projectId || exportMode !== 'readonly') return;
    try {
      const res = await authenticatedGet(`/api/sharepoint/files?projectId=${encodeURIComponent(projectId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.items)) {
        setMaterials(findAdditionalMaterials(data.items));
      }
    } catch (err) {
      console.warn('[BusinessQuestionnaire] additional materials load failed:', err);
    }
  }, [projectId, exportMode]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleAddMaterials = async (fileList: FileList | null) => {
    if (!projectId || !fileList || fileList.length === 0) return;
    setIsUploadingMaterial(true);
    try {
      const sharepointFolderId = (project as any)?.sharepointFolderId as string | undefined;
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        if (sharepointFolderId) formData.append('folderId', sharepointFolderId);
        formData.append('subfolder', ADDITIONAL_MATERIALS_FOLDER);
        const res = await authenticatedFormPost('/api/sharepoint/upload', formData);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message || err?.error || 'Failed to upload file');
        }
      }
      await loadMaterials();
    } catch (err) {
      console.error('Error uploading additional materials:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload materials. Please try again.');
    } finally {
      setIsUploadingMaterial(false);
      if (materialsInputRef.current) materialsInputRef.current.value = '';
    }
  };

  const loadAll = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setIsLoading(true);
      const [adminData, projectData] = await Promise.all([
        getAdminSettings<{ questionnaireRules?: QuestionnaireRule[] }>(),
        projectId ? getProject(projectId) : Promise.resolve(null),
      ]);
      const loadedRules: QuestionnaireRule[] = adminData?.questionnaireRules || [];
      console.log('[BusinessQuestionnaire] loaded rules:', loadedRules.length);

      let projectResponses: QuestionnaireResponse[] = [];
      if (projectId) {
        try {
          const res = await fetch(`/api/projects/${projectId}/questionnaire-responses`);
          if (res.ok) {
            const json = await res.json();
            projectResponses = Array.isArray(json?.responses) ? json.responses : [];
          }
        } catch (err) {
          console.warn('[BusinessQuestionnaire] responses load failed:', err);
        }
      }

      if (signal?.cancelled) return;
      setRules(loadedRules);
      setResponses(projectResponses);
      setProject(projectData);
      setHiddenIds(Array.isArray(projectData?.hiddenQuestionnaireRuleIds) ? projectData!.hiddenQuestionnaireRuleIds! : []);
    } catch (err) {
      console.error('Error loading business questionnaire:', err);
    } finally {
      if (!signal?.cancelled) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadAll(signal);
    const onImported = () => loadAll();
    window.addEventListener('questionnaire-responses-imported', onImported);
    return () => {
      signal.cancelled = true;
      window.removeEventListener('questionnaire-responses-imported', onImported);
    };
  }, [loadAll]);

  const handleRegenerate = async () => {
    if (!projectId) return;
    setIsRegenerating(true);
    try {
      if (hiddenIds.length > 0) {
        await updateProject(projectId, { hiddenQuestionnaireRuleIds: [] } as Partial<Project>);
      }
      await loadAll();
    } catch (err) {
      console.error('Error regenerating questions:', err);
      alert('Failed to regenerate questions. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!projectId) return;
    setIsExporting(true);
    try {
      if (exportMode === 'readonly') {
        // Defer entirely to the PQ Memo PDF route — same data load, same
        // styling as the full Pre-Qual export, just trimmed to the BQ block.
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/pq-memo-pdf?section=business-questionnaire`,
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: 'Failed to generate PDF' }));
          throw new Error(errBody?.error || 'Failed to generate PDF');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const projectName =
          project?.projectName || (po as any)?.projectName || 'Business_Questionnaire';
        link.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Questionnaire.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // Re-fetch the project so the export uses the persisted hidden-question list,
      // not whatever React state happens to hold. This guards against any stale-state
      // edge case where a pending delete hasn't been reflected in component state yet.
      const freshProject = await getProject(projectId);
      const freshHiddenIds: string[] = Array.isArray(freshProject?.hiddenQuestionnaireRuleIds)
        ? freshProject!.hiddenQuestionnaireRuleIds!
        : [];
      const hiddenIdSet = new Set(freshHiddenIds);

      const projectName = freshProject?.projectName || project?.projectName || (po as any)?.projectName || 'Business Questionnaire';
      const exportRules = rules
        .filter((rule) => filterRuleByProject(rule as any, po))
        .filter((rule) => !hiddenIdSet.has(rule.id));

      console.log('[BusinessQuestionnaire] Exporting PDF — total rules:', rules.length, 'applicable:', exportRules.length, 'hidden:', freshHiddenIds.length);

      // Sync local state if the persisted list differs from what's in memory
      // (so the UI matches the PDF after export).
      if (freshHiddenIds.length !== hiddenIds.length || freshHiddenIds.some((id) => !hiddenIds.includes(id))) {
        setHiddenIds(freshHiddenIds);
      }

      const rawPurpose = po?.primaryProjectPurpose;
      const primaryPurposeStr = Array.isArray(rawPurpose) ? rawPurpose.join(', ') : rawPurpose;
      const primaryPurposeArr: string[] = Array.isArray(rawPurpose)
        ? rawPurpose.filter(Boolean)
        : (rawPurpose ? [rawPurpose] : []);
      const secondaryPurposes: string[] = Array.isArray(po?.secondaryProjectPurposes)
        ? po!.secondaryProjectPurposes!.filter(Boolean)
        : [];
      const logoBytes = await fetchLogoBytes();
      const pdfBytes = await generateQuestionnairePdf(
        projectName,
        exportRules,
        responses,
        primaryPurposeStr,
        {
          logoBytes,
          projectPurposes: { primary: primaryPurposeArr, secondary: secondaryPurposes },
        },
      );
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Questionnaire.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting questionnaire PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteQuestion = async (ruleId: string) => {
    if (!projectId) return;
    setPendingDeleteId(ruleId);
    try {
      const next = Array.from(new Set([...hiddenIds, ruleId]));
      await updateProject(projectId, { hiddenQuestionnaireRuleIds: next } as Partial<Project>);
      setHiddenIds(next);
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to remove question. Please try again.');
    } finally {
      setPendingDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-[#1a1a1a] mb-6">Business Questionnaire</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
          <span className="ml-3 text-[#7da1d4]">Loading questionnaire...</span>
        </div>
      </div>
    );
  }

  const applicableRules = rules
    .filter((rule) => filterRuleByProject(rule as any, po))
    .filter((rule) => !hiddenIds.includes(rule.id));

  const categoryOrder: Array<QuestionnaireRule['mainCategory']> = ['Business Overview', 'Project Purpose', 'Industry'];
  const groupedRules = categoryOrder.reduce((acc, category) => {
    acc[category] = applicableRules
      .filter((rule) => rule.mainCategory === category)
      .sort((a, b) => (a.questionOrder || 0) - (b.questionOrder || 0));
    return acc;
  }, {} as Record<string, QuestionnaireRule[]>);

  const sortedCategories = categoryOrder.filter((category) => groupedRules[category].length > 0);

  const primaryRaw = po?.primaryProjectPurpose;
  const primaryArr: string[] = Array.isArray(primaryRaw) ? primaryRaw : (primaryRaw ? [primaryRaw] : []);
  const primaryPurpose = primaryArr[0] || '';
  const extraPrimary = primaryArr.slice(1);
  const secondaryPurposes: string[] = Array.isArray((po as any)?.secondaryProjectPurposes)
    ? (po as any).secondaryProjectPurposes
    : [];
  const purposeBlocks = groupRulesByPurpose(
    groupedRules['Project Purpose'] || [],
    primaryPurpose,
    [...extraPrimary, ...secondaryPurposes],
  );

  const responseMap = new Map<string, string>();
  for (const r of responses) {
    responseMap.set(r.ruleId, r.content || '');
  }

  // Show the "Add Additional Materials" affordance on the PQ Memo / PreQual
  // (read-only) view regardless of whether the questionnaire has been filled
  // out, so materials can always be attached.
  const showAddMaterials = exportMode === 'readonly';

  // Read-only (PQ Memo) list of uploaded supplementary files, shown above the
  // Business Overview section once any have been uploaded.
  const materialsBlock =
    exportMode === 'readonly' && materials.length > 0 ? (
      <div
        className="bg-white border border-[#c5d4e8] rounded-lg p-4 mb-8"
        data-testid="additional-materials-list"
      >
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="w-4 h-4 text-[#2563eb]" />
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Additional Materials</h3>
        </div>
        <ul className="space-y-1.5">
          {materials.map((m) => (
            <li key={m.id}>
              <a
                href={m.webUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 text-[13px] ${
                  m.webUrl
                    ? 'text-[#2563eb] hover:underline'
                    : 'text-[#1a1a1a] pointer-events-none'
                }`}
                data-testid={`additional-material-${m.id}`}
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="break-all">{m.name}</span>
                {m.webUrl && <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-70" />}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const showExportButton = editable || showExport;
  const headerControls = (editable || showExportButton) ? (
    <div className="flex items-center gap-2 flex-shrink-0">
      {editable && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating || !projectId}
          data-testid="button-regenerate-questions"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Questions
            </>
          )}
        </Button>
      )}
      {showAddMaterials && (
        <>
          <input
            ref={materialsInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleAddMaterials(e.target.files)}
            data-testid="input-additional-materials"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => materialsInputRef.current?.click()}
            disabled={isUploadingMaterial || !projectId}
            data-testid="button-add-additional-materials"
          >
            {isUploadingMaterial ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Paperclip className="w-4 h-4 mr-2" />
                Add Additional Materials
              </>
            )}
          </Button>
        </>
      )}
      {showExportButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isExporting || applicableRules.length === 0 || !projectId}
          data-testid="button-export-questionnaire-pdf"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </>
          )}
        </Button>
      )}
    </div>
  ) : null;

  if (applicableRules.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#2563eb]" />
            <h1 className="text-xl font-bold text-[#1a1a1a]">Business Questionnaire</h1>
          </div>
          {headerControls}
        </div>
        {materialsBlock}
        <div className="bg-white border border-[#c5d4e8] rounded-lg p-12 text-center">
          <p className="text-[#7da1d4] text-[13px]" data-testid="text-no-questionnaire-items">
            {rules.length === 0
              ? 'No questionnaire rules have been configured yet. Import them in Admin Settings → Questionnaire Rules.'
              : hiddenIds.length > 0
                ? editable
                  ? 'All applicable questions have been removed. Click "Regenerate Questions" to restore them.'
                  : 'All applicable questions have been removed. Open the Edit Questionnaire tab to restore them.'
                : `No questionnaire items match this project's criteria (${rules.length} rules loaded, 0 applicable).`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#2563eb]" />
          <h1 className="text-xl font-bold text-[#1a1a1a]" data-testid="text-readonly-questionnaire-title">Business Questionnaire</h1>
        </div>
        {headerControls}
      </div>

      <p className="text-[13px] text-[#7da1d4] mb-6">
        {editable
          ? 'Review the questions below. Use the trashcan to remove a question for this project, or "Regenerate Questions" to restore all questions.'
          : "The following questions and answers are based on your project's details. This is a read-only view."}
      </p>

      {materialsBlock}

      <div className="space-y-8">
        {sortedCategories.map((category) => {
          let questionNumber = 0;
          let sectionTitle: string = category;

          if (category === 'Industry' && (po as any)?.industry) {
            sectionTitle = `${category} - ${(po as any).industry}`;
          }

          const renderRuleItem = (rule: QuestionnaireRule) => {
            if (rule.blockType !== 'question') return null;
            questionNumber++;
            const rawAnswer = responseMap.get(rule.id) || '';
            const answer = stripHtml(rawAnswer);
            const isDeleting = pendingDeleteId === rule.id;
            return (
              <div key={rule.id} className="relative group">
                <div className="absolute -left-6 top-6 text-[13px] font-medium text-[#7da1d4]">
                  {questionNumber}.
                </div>
                <div className="bg-white border border-[#c5d4e8] rounded-lg p-3 mb-2" data-testid={`readonly-question-${rule.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[13px] font-medium text-[#1a1a1a] flex-1">{rule.questionText}</h3>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(rule.id)}
                        disabled={isDeleting}
                        className="text-[#7da1d4] hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 p-1 -m-1"
                        title="Remove this question"
                        aria-label="Remove this question"
                        data-testid={`button-delete-question-${rule.id}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  <div
                    className={`text-[13px] ${answer ? 'text-[#1a1a1a]' : 'text-[#999] italic'}`}
                    style={{ whiteSpace: 'pre-wrap', minHeight: 20 }}
                    data-testid={`text-readonly-answer-${rule.id}`}
                  >
                    {answer || 'No response provided'}
                  </div>
                </div>
              </div>
            );
          };

          if (category === 'Project Purpose') {
            return (
              <div key={category} data-testid={`readonly-category-section-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4 pb-2 border-b-2 border-[#2563eb]">
                  {sectionTitle}
                </h3>
                <div className="space-y-4">
                  {purposeBlocks.map((block, blockIndex) => (
                    <div key={`${block.purposeName || '__general'}-${blockIndex}`}>
                      {block.purposeName && (
                        <h4
                          data-testid={`text-readonly-purpose-subheader-${block.purposeName}`}
                          className="text-base font-semibold text-[#7da1d4] mb-3 mt-6 pb-1 border-b border-[#c5d4e8]"
                        >
                          {block.purposeName}
                        </h4>
                      )}
                      {block.rules.map(renderRuleItem)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={category} data-testid={`readonly-category-section-${category.toLowerCase().replace(/\s+/g, '-')}`}>
              <h3 className="text-xl font-semibold text-[#1a1a1a] mb-4 pb-2 border-b-2 border-[#2563eb]">
                {sectionTitle}
              </h3>
              <div className="space-y-4">
                {groupedRules[category].map(renderRuleItem)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
