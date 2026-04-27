'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3, ClipboardList, ChevronDown, TrendingUp, Bold, Italic, List, ListOrdered, Heading2, Download } from 'lucide-react';
import CreditMatrixScoring from '@/components/CreditMatrixScoring';
import SpreadComparisonTable from '@/components/SpreadComparisonTable';
import { useApplication } from '@/lib/applicationStore';
import { Button } from '@/components/ui/button';


interface PQMemoFormProps {
  projectId: string;
}

const SOURCES_USES_ROW_KEYS = [
  'realEstate', 'debtRefiCRE', 'debtRefiNonCRE', 'equipment',
  'furnitureFixtures', 'inventory', 'businessAcquisition',
  'workingCapital', 'closingCosts', 'other',
] as const;

const SOURCES_USES_ROW_LABELS: Record<string, string> = {
  realEstate: 'Real Estate',
  debtRefiCRE: 'Debt Refi (CRE)',
  debtRefiNonCRE: 'Debt Refi (Non-CRE)',
  equipment: 'Equipment',
  furnitureFixtures: 'Furniture & Fixtures',
  inventory: 'Inventory',
  businessAcquisition: 'Business Acquisition',
  workingCapital: 'Working Capital',
  closingCosts: 'Closing Costs',
  other: 'Other',
};

function BDOSummaryEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
      requestAnimationFrame(() => { isInternalChange.current = false; });
    }
  }, [onChange]);

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const toolbarBtnClass = "px-2.5 py-1 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors text-xs font-medium flex items-center gap-1";

  return (
    <div className="border border-[#d1d5db] rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <button type="button" onClick={() => execCommand('bold')} className={toolbarBtnClass} title="Bold">
          Bold
        </button>
        <button type="button" onClick={() => execCommand('italic')} className={toolbarBtnClass} title="Italic">
          Italic
        </button>
        <div className="w-px h-5 bg-[#d1d5db] mx-1" />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className={toolbarBtnClass} title="Bullet List">
          Bullet
        </button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} className={toolbarBtnClass} title="Numbered List">
          Numbered List
        </button>
        <div className="w-px h-5 bg-[#d1d5db] mx-1" />
        <button type="button" onClick={() => execCommand('formatBlock', '<h3>')} className={toolbarBtnClass} title="Heading">
          Heading
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[400px] px-4 py-3 text-[15px] text-[#1a1a1a] font-sans outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-[#9ca3af] [&:empty]:before:pointer-events-none prose prose-sm max-w-none"
        data-placeholder="Write your thoughts on this deal..."
        data-testid="editor-bdo-summary"
      />
    </div>
  );
}

export default function PQMemoForm({ projectId }: PQMemoFormProps) {
  const { data: applicationData, updateProjectOverview } = useApplication();

  const [spreadFinancingSources, setSpreadFinancingSources] = useState<any[]>([]);
  const [goodFitHelpExpanded, setGoodFitHelpExpanded] = useState(false);
  const [scoreExplanations, setScoreExplanations] = useState({
    repayment: '',
    management: '',
    equity: '',
    collateral: '',
    credit: '',
    liquidity: '',
  });

  const projectOverview = applicationData.projectOverview;
  const loan1 = applicationData.loan1;
  const loan2 = applicationData.loan2;
  const dscr = applicationData.dscr;
  const individualApplicants = applicationData.individualApplicants;
  const businessApplicant = applicationData.businessApplicant;

  // Use whichever Sources & Uses table has data (prefer 7a)
  const sourcesUses = applicationData.sourcesUses7a;

  const creditScoring = {
    repayment: projectOverview.riskRepayment ?? 0,
    management: projectOverview.riskManagement ?? 0,
    equity: projectOverview.riskEquity ?? 0,
    collateral: projectOverview.riskCollateral ?? 0,
    credit: projectOverview.riskCredit ?? 0,
    liquidity: projectOverview.riskLiquidity ?? 0,
  };

  const handleScoreChange = (category: string, score: number) => {
    const fieldMap: Record<string, string> = {
      repayment: 'riskRepayment',
      management: 'riskManagement',
      equity: 'riskEquity',
      collateral: 'riskCollateral',
      credit: 'riskCredit',
      liquidity: 'riskLiquidity',
    };
    const field = fieldMap[category];
    if (field) {
      updateProjectOverview({ [field]: score });
    }
  };

  const handleExplanationChange = (category: string, explanation: string) => {
    setScoreExplanations(prev => ({ ...prev, [category]: explanation }));
  };

  const formatCurrency = (value: number | string | undefined | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num) || num === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatPercent = (value: number | undefined | null, decimals = 1) => {
    if (value == null || isNaN(value)) return '-';
    return `${value.toFixed(decimals)}%`;
  };

  const calculateTotalScore = () => {
    return creditScoring.repayment + creditScoring.management + creditScoring.equity +
           creditScoring.collateral + creditScoring.credit + creditScoring.liquidity;
  };

  // Extract row data from SourcesUses (dynamic column keys)
  const getRow = (key: string): Record<string, any> => {
    const row = (sourcesUses as Record<string, unknown>)?.[key];
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      return row as Record<string, any>;
    }
    return {};
  };

  // Fetch financing sources from the active spread
  useEffect(() => {
    async function fetchFinancingSources() {
      try {
        const res = await fetch(`/api/projects/${projectId}/financials`);
        if (res.ok) {
          const data = await res.json();
          // Find the active spread, or use the most recent one
          const active = data.find((s: any) => s.isActive) || (data.length > 0 ? data[data.length - 1] : null);
          if (active?.financingSources) {
            setSpreadFinancingSources(active.financingSources);
          }
        }
      } catch (err) {
        console.error('Error loading financing sources:', err);
      }
    }
    if (projectId) fetchFinancingSources();
  }, [projectId]);

  const exportToPDF = async () => {
    if (!projectId) {
      alert('Cannot generate PDF: Project ID is missing');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/pq-memo-pdf`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(error.error || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PQ_Memo_${applicationData.projectOverview.projectName || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 5000);
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert(error.message || 'Failed to generate PDF. Please try again.');
    }
  };

  // Build dynamic S&U columns from financing sources in the store, deduplicating
  const financingSources = applicationData.financingSources || [];
  const suColumns = financingSources.length > 0
    ? (() => {
        const counts: Record<string, number> = {};
        return financingSources.map(fs => {
          const base = fs.financingType || fs.id;
          counts[base] = (counts[base] || 0) + 1;
          return counts[base] > 1 ? `${base} (${counts[base]})` : base;
        });
      })()
    : ['tBankLoan', 'borrower', 'sellerNote', 'thirdParty']; // fallback

  const calculateSourcesUsesTotals = () => {
    const totals: Record<string, number> = {};
    for (const col of suColumns) totals[col] = 0;

    for (const rowKey of SOURCES_USES_ROW_KEYS) {
      const row = getRow(rowKey);
      for (const col of suColumns) {
        totals[col] += (row[col] || 0);
      }
    }

    const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);

    const percentages: Record<string, number> = {};
    for (const col of suColumns) {
      percentages[col] = grandTotal > 0 ? (totals[col] / grandTotal) * 100 : 0;
    }

    return { totals, percentages, grandTotal };
  };

  const { totals, percentages, grandTotal } = calculateSourcesUsesTotals();

  const primaryProjectPurpose = Array.isArray(projectOverview.primaryProjectPurpose)
    ? projectOverview.primaryProjectPurpose.join(', ')
    : (projectOverview.primaryProjectPurpose || '');

  // Build DSCR display items from store data
  const dscrItems = [
    { label: dscr?.period1 ? `${dscr.period1} DSCR` : 'Period 1 DSCR', value: dscr?.dscr1 },
    { label: dscr?.period2 ? `${dscr.period2} DSCR` : 'Period 2 DSCR', value: dscr?.dscr2 },
    { label: dscr?.period3 ? `${dscr.period3} DSCR` : 'Period 3 DSCR', value: dscr?.dscr3 },
    { label: dscr?.period4 ? `${dscr.period4} DSCR` : 'Period 4 DSCR', value: dscr?.dscr4 },
  ];

  const ReferralDisplay = ({ label, value }: { label: string; value: string | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex gap-1.5 items-baseline text-xs mb-1">
        <strong className="uppercase tracking-wide opacity-80">{label}:</strong>
        <span>{value}</span>
      </div>
    );
  };

  const MetricDisplay = ({ label, value }: { label: string; value: number | null | undefined }) => {
    const displayValue = value != null ? value.toFixed(2) : 'N/A';

    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-md p-3 text-center" data-testid={`metric-display`}>
        <div className="text-[11px] uppercase tracking-wide text-gray-600 mb-1.5">{label}</div>
        <div className="text-2xl font-bold text-gray-800 leading-none">{displayValue}</div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-6xl mx-auto bg-gray-50 px-5 pb-5">
      {/* Sits above the card, left-aligned with it. Block flow means it
          never overlaps the gradient header or pushes its contents. */}
      <div className="pt-3 pb-2">
        <Button
          onClick={exportToPDF}
          className="bg-gradient-to-r from-gray-700 to-blue-600 hover:shadow-xl shadow-lg text-white"
          data-testid="button-export-pdf"
        >
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">

        <div className="bg-gradient-to-r from-gray-700 to-blue-600 text-white p-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5">
            <div>
              <h1 className="text-xl font-bold text-white mb-1" data-testid="text-borrower-name">
                {projectOverview.projectName || 'Business Name'}
              </h1>
              <div className="text-sm opacity-95 mb-0.5" data-testid="text-bdo-names">
                BDO: {projectOverview.bdo1 || projectOverview.bdoName}{projectOverview.bdo2 ? `, ${projectOverview.bdo2}` : ''}
              </div>
            </div>

            <div className="text-right">
              <ReferralDisplay label="Referral Source" value={projectOverview.referralSource} />
              <ReferralDisplay label="Referral Firm" value={projectOverview.referralFirm} />
              <ReferralDisplay label="Referral Fee" value={projectOverview.referralFee != null ? formatPercent(projectOverview.referralFee) : undefined} />
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-gray-50 h-auto p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white px-6 py-3 gap-2"
              data-testid="tab-overview"
            >
              <FileText className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="risk-scores"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white px-6 py-3 gap-2"
              data-testid="tab-risk-scores"
            >
              <BarChart3 className="w-4 h-4" />
              Risk Scores
            </TabsTrigger>
            <TabsTrigger
              value="bdo-summary"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white px-6 py-3 gap-2"
              data-testid="tab-bdo-summary"
            >
              <ClipboardList className="w-4 h-4" />
              BDO Summary
            </TabsTrigger>
            <TabsTrigger
              value="financials"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white px-6 py-3 gap-2"
              data-testid="tab-financials"
            >
              <TrendingUp className="w-4 h-4" />
              Financials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="p-5">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                  Loan Structure & Project Information
                </h2>
            {(() => {
              const formatRate = (val: any) => {
                if (val == null || val === '') return '-';
                const n = typeof val === 'string' ? parseFloat(val) : val;
                if (isNaN(n)) return String(val);
                // If value is already > 1, it's already a percentage
                return `${n < 1 ? (n * 100).toFixed(2) : n.toFixed(2)}%`;
              };

              // Use actual sources from the spread, or show placeholder cards
              const PLACEHOLDER_CARDS = ['P&E', 'USDA', 'Conventional', 'SBA 7(a) Express', 'SBA CAPLine', 'Equity', 'Seller Notes', '3rd Party'];
              // Prefer live store data (what the Spreads tab edits) so inline
              // edits like Amount refresh here without a reload. Fall back to
              // the API-fetched spread data for projects that only have an
              // uploaded workbook and no inline edits yet.
              const activeFinancingSources = financingSources.length > 0
                ? financingSources
                : spreadFinancingSources;
              const hasSpreadData = activeFinancingSources.length > 0;

              // Build cards: use spread data if available, otherwise show placeholders.
              // When spread data is present, render exactly one card per imported
              // source (N/A columns have already been filtered upstream by the
              // parser). Only pad to 8 cards in the no-spread placeholder case.
              const sourceCards = hasSpreadData
                ? activeFinancingSources.map((src: any, i: number) => ({
                    key: `src-${i}`,
                    label: src.financingSource || src.financingType || src.label || `Source ${i + 1}`,
                    src,
                  }))
                : PLACEHOLDER_CARDS.map((label, i) => ({
                    key: `placeholder-${i}`,
                    label,
                    src: null as any,
                  }));

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sourceCards.map((card) => (
                    <div key={card.key} className="bg-gray-50 rounded-md p-3.5 border-l-[3px] border-blue-500" data-testid={`card-${card.key}`}>
                      <h3 className="text-[15px] font-semibold text-gray-700 mb-2.5">{card.label}</h3>
                      <div className="flex flex-col gap-1">
                        {card.src ? (
                          <>
                            <div className="flex justify-between text-[13px]">
                              <span>Amount:</span>
                              <strong className="text-gray-700">{formatCurrency(card.src.amount)}</strong>
                            </div>
                            {card.src.guaranteePercent && String(card.src.guaranteePercent).trim() && (
                              <div className="flex justify-between text-[13px]">
                                <span>Guarantee:</span>
                                <strong className="text-gray-700">{card.src.guaranteePercent}</strong>
                              </div>
                            )}
                            {card.src.rateType && (
                              <div className="flex justify-between text-[13px]">
                                <span>Rate Type:</span>
                                <strong className="text-gray-700">{card.src.rateType}</strong>
                              </div>
                            )}
                            {card.src.totalRate != null && card.src.totalRate !== '' && (
                              <div className="flex justify-between text-[13px]">
                                <span>Rate:</span>
                                <strong className="text-gray-700">{formatRate(card.src.totalRate)}</strong>
                              </div>
                            )}
                            {card.src.termYears != null && card.src.termYears !== '' && (
                              <div className="flex justify-between text-[13px]">
                                <span>Term:</span>
                                <strong className="text-gray-700">{card.src.termYears} years</strong>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[13px] text-gray-400 italic">No data</div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Project Information card — always last */}
                  <div className="bg-gray-50 rounded-md p-3.5 border-l-[3px] border-blue-500" data-testid="card-project-info">
                    <h3 className="text-[15px] font-semibold text-gray-700 mb-2.5">Project Information</h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[13px]">
                        <span>Type:</span>
                        <strong className="text-gray-700">{primaryProjectPurpose || '-'}</strong>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span>NAICS:</span>
                        <strong className="text-gray-700">{projectOverview.naicsCode || '-'}</strong>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span>Industry:</span>
                        <strong className="text-gray-700">{projectOverview.industry || '-'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                  Risk Scores
                </h2>
                <div className="rounded-md overflow-hidden shadow-sm">
                  <table className="w-full border-collapse">
                    <thead className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                      <tr>
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Category</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Repayment</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Management</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Equity</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Collateral</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Credit</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Liquidity</th>
                        <th className="text-center py-2.5 px-3 text-[11px] uppercase tracking-wide font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white border-b border-gray-200">
                        <td className="py-2.5 px-3 text-[13px] font-medium text-gray-700"></td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200" data-testid="score-repayment">{creditScoring.repayment}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200" data-testid="score-management">{creditScoring.management}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200" data-testid="score-equity">{creditScoring.equity}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200" data-testid="score-collateral">{creditScoring.collateral}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200" data-testid="score-credit">{creditScoring.credit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200" data-testid="score-liquidity">{creditScoring.liquidity}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block min-w-[34px] px-2.5 py-0.5 rounded-full text-[14px] font-bold bg-gray-700 text-white" data-testid="text-total-score">{calculateTotalScore()}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

          {projectOverview.projectDescription && (
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                Project Description
              </h2>
              <div className="bg-gray-50 p-3 rounded-md border-l-[3px] border-blue-500 text-[13px] leading-relaxed text-gray-700" data-testid="text-project-description">
                {projectOverview.projectDescription}
              </div>
            </div>
          )}

          {applicationData.sellerInfo?.businessDescription && (
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                Business Description
              </h2>
              <div className="bg-gray-50 p-3 rounded-md border-l-[3px] border-blue-500 text-[13px] leading-relaxed text-gray-700" data-testid="text-business-description">
                {applicationData.sellerInfo.businessDescription}
              </div>
            </div>
          )}

          <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                Key Individuals
              </h2>
              <div className="rounded-md overflow-hidden shadow-sm">
                <table className="w-full border-collapse">
                  <thead className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                    <tr>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Name</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Role</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Ownership %</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Involvement</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Experience</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Net Worth</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Post-Close Liquidity</th>
                      <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Required Income from Business</th>
                    </tr>
                  </thead>
                  <tbody>
                    {individualApplicants.length > 0 ? individualApplicants.map((individual, idx) => {
                      const experience = individual.experience && individual.yearsOfExperience
                        ? `${individual.experience} - ${individual.yearsOfExperience} years`
                        : individual.experience || '-';

                      return (
                        <tr
                          key={individual.id}
                          className="bg-white border-b border-gray-200 hover:bg-gray-50"
                          data-testid={`row-individual-${idx}`}
                        >
                          <td className="py-2 px-2 text-[13px] font-medium text-gray-700">
                            {individual.firstName} {individual.lastName}
                          </td>
                          <td className="py-2 px-2 text-[13px]">{individual.projectRole || '-'}</td>
                          <td className="py-2 px-2 text-[13px]">{Number(individual.ownershipPercentage ?? 0).toFixed(2)}%</td>
                          <td className="py-2 px-2 text-[13px]">{individual.businessRole || '-'}</td>
                          <td className="py-2 px-2 text-[13px]">{experience}</td>
                          <td className="py-2 px-2 text-[13px]">{formatCurrency(individual.netWorth)}</td>
                          <td className="py-2 px-2 text-[13px]">{formatCurrency(individual.pcLiquidity)}</td>
                          <td className="py-2 px-2 text-[13px]">{formatCurrency(individual.reqDraw)}</td>
                        </tr>
                      );
                    }) : (
                      <tr className="bg-white">
                        <td colSpan={8} className="py-4 px-2 text-[13px] text-gray-400 text-center">No individual applicants added yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
              Sources and Uses
            </h2>
            <div className="rounded-md overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <thead className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                  <tr>
                    <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Use Category</th>
                    {suColumns.map(col => (
                      <th key={col} className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">{col}</th>
                    ))}
                    <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wide font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-blue-50">
                    <td className="py-2 px-2 text-[13px] font-semibold text-blue-700">%</td>
                    {suColumns.map(col => (
                      <td key={col} className="py-2 px-2 text-[13px] text-right font-semibold text-blue-700">{formatPercent(percentages[col])}</td>
                    ))}
                    <td className="py-2 px-2 text-[13px] text-right font-semibold text-blue-700">{grandTotal > 0 ? '100%' : '-'}</td>
                  </tr>
                  {SOURCES_USES_ROW_KEYS.map((rowKey) => {
                    const row = getRow(rowKey);
                    const rowTotal = suColumns.reduce((sum, col) => sum + (row[col] || 0), 0);
                    if (rowTotal === 0) return null;

                    return (
                      <tr key={rowKey} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2 text-[13px] font-medium text-gray-700">{SOURCES_USES_ROW_LABELS[rowKey]}</td>
                        {suColumns.map(col => (
                          <td key={col} className="py-2 px-2 text-[13px] text-right">{(row[col] || 0) > 0 ? formatCurrency(row[col]) : ''}</td>
                        ))}
                        <td className="py-2 px-2 text-[13px] text-right font-medium">{formatCurrency(rowTotal)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 border-t-2 border-gray-700 font-semibold">
                    <td className="py-2 px-2 text-[13px] text-gray-700">Total</td>
                    {suColumns.map(col => (
                      <td key={col} className="py-2 px-2 text-[13px] text-right text-gray-700">{formatCurrency(totals[col])}</td>
                    ))}
                    <td className="py-2 px-2 text-[13px] text-right text-gray-700 font-semibold">{formatCurrency(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                  Cash Flow Analysis
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {dscrItems.map((item, idx) => (
                    <MetricDisplay key={idx} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="risk-scores" className="mt-0">
            <div className="p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                  Credit Matrix Scoring
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Evaluate the loan application across six key risk categories. Each category is scored from 1-5, with higher scores indicating lower risk.
                </p>
              </div>
              <CreditMatrixScoring
                scores={creditScoring}
                onScoreChange={handleScoreChange}
                explanations={scoreExplanations}
                onExplanationChange={handleExplanationChange}
                disabled={false}
              />
            </div>
          </TabsContent>

          {/* BDO Summary Tab */}
          <TabsContent value="bdo-summary" className="mt-0">
            <div className="p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-700 mb-2.5 pb-1.5 border-b-2 border-blue-500">
                  BDO Summary
                </h2>
              </div>

              <BDOSummaryEditor
                value={projectOverview.bdoComments || ''}
                onChange={(html) => updateProjectOverview({ bdoComments: html })}
              />
            </div>
          </TabsContent>

          <TabsContent value="financials" className="mt-0">
            <PQMemoFinancials projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
  );
}

interface FinancialPeriod {
  periodLabel?: string;
  [key: string]: any;
}

interface FinancialSpread {
  id: string;
  versionLabel: string;
  fileName: string;
  isActive: boolean;
  uploadedAt?: string;
  periodData?: FinancialPeriod[];
}

function PQMemoFinancials({ projectId }: { projectId: string }) {
  const [spreads, setSpreads] = useState<FinancialSpread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSpreads() {
      try {
        const res = await fetch(`/api/projects/${projectId}/financials`);
        if (res.ok) {
          const data = await res.json();
          setSpreads(data);
        }
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSpreads();
  }, [projectId]);

  const latestSpread = spreads.length > 0 ? spreads[spreads.length - 1] : null;
  const periods = (latestSpread?.periodData || []) as FinancialPeriod[];

  if (isLoading) {
    return (
      <div className="p-5 text-center text-[#7da1d4]">
        <div className="inline-block animate-spin w-6 h-6 border-3 border-[#2563eb] border-t-transparent rounded-full mb-2" />
        <p className="text-sm">Loading financial data...</p>
      </div>
    );
  }

  if (!latestSpread || periods.length === 0) {
    return (
      <div className="p-5 text-center py-16">
        <TrendingUp className="w-10 h-10 text-[#7da1d4] mx-auto mb-3" />
        <p className="text-[#7da1d4] text-sm">No financial spreads available for this project.</p>
        <p className="text-[#7da1d4] text-xs mt-1">Upload spreads from the Spreads tab to see the comparison view here.</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-700 mb-1 pb-1.5 border-b-2 border-blue-500">
          Financial Spread Comparison
        </h2>
        <p className="text-xs text-[#7da1d4]">
          {latestSpread.fileName} — {periods.length} period{periods.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <SpreadComparisonTable periods={periods} />
      </div>
    </div>
  );
}
