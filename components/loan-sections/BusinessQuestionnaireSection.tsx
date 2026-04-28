'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, FileDown, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/lib/applicationStore';
import { collection, query, getDocs, db } from '@/lib/db';
import { getAdminSettings, getProject, updateProject } from '@/services/firestore';
import { generateQuestionnairePdf, type QuestionnaireRule, type QuestionnaireResponse } from '@/lib/questionnairePdf';
import type { Project } from '@/types';

function normalizePurpose(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
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
  const ordered = [primaryPurpose, ...secondaryPurposes].filter(Boolean);
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

export default function BusinessQuestionnaireSection() {
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
          const responsesSnapshot = await getDocs(query(collection(db, 'questionnaireResponses')));
          projectResponses = responsesSnapshot.docs
            .map((d: any) => ({ id: d.id, ...d.data() } as QuestionnaireResponse))
            .filter((r: any) => r.projectId === projectId);
        } catch (err) {
          console.warn('[BusinessQuestionnaire] responses load failed (shim):', err);
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
    return () => { signal.cancelled = true; };
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
      const projectName = project?.projectName || (po as any)?.projectName || 'Business Questionnaire';
      const exportRules = rules
        .filter((rule) => filterRuleByProject(rule as any, po))
        .filter((rule) => !hiddenIds.includes(rule.id));
      const rawPurpose = po?.primaryProjectPurpose;
      const primaryPurposeStr = Array.isArray(rawPurpose) ? rawPurpose.join(', ') : rawPurpose;
      const pdfBytes = await generateQuestionnairePdf(
        projectName,
        exportRules,
        responses,
        primaryPurposeStr,
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
    if (!confirm('Remove this question from the questionnaire?\n\nYou can restore all questions by clicking "Regenerate Questions".')) return;
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

  const headerControls = (
    <div className="flex items-center gap-2 flex-shrink-0">
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
            Export to PDF
          </>
        )}
      </Button>
    </div>
  );

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
        <div className="bg-white border border-[#c5d4e8] rounded-lg p-12 text-center">
          <p className="text-[#7da1d4] text-[13px]" data-testid="text-no-questionnaire-items">
            {rules.length === 0
              ? 'No questionnaire rules have been configured yet. Import them in Admin Settings → Questionnaire Rules.'
              : hiddenIds.length > 0
                ? 'All applicable questions have been removed. Click "Regenerate Questions" to restore them.'
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
        The following questions and answers are based on your project's details. This is a read-only view.
      </p>

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
                  {purposeBlocks.map((block) => (
                    <div key={block.purposeName || '__general'}>
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
