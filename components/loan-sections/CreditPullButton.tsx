'use client';

/**
 * Soft Credit Pull dialog button — ported from the Replit `CreditPullButton`.
 *
 * Codebase deltas:
 *   - No `@tanstack/react-query` → plain `useState` + `useEffect` + `fetch`.
 *   - No `apiRequest` helper      → `authenticatedFetch` from this repo.
 *   - Types come from `@/lib/creditPullTypes` (this codebase doesn't share
 *     a Zod schema package with the server).
 *
 * The dialog UX (confirm → pulling → result/no-hit/error views and the
 * historical badge) is intentionally identical to the Replit version.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import {
  BUREAU_DISPLAY_NAMES,
  BUREAUS,
  type Bureau,
  type CreditPullResult,
  type CreditPullRow,
  type CreditPullScoreModel,
} from '@/lib/creditPullTypes';

interface CreditPullButtonProps {
  applicantId: string;
  projectId?: string;
  applicantName: string;
  prefill: {
    firstName: string;
    middleName?: string;
    lastName: string;
    ssn: string;
    dateOfBirth?: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  index: number;
}

type View = 'confirm' | 'pulling' | 'result' | 'no-hit' | 'error';

function scoreColorClass(score: number | null | undefined): string {
  if (score == null) return 'text-[#4a6fa5]';
  if (score < 580) return 'text-red-600';
  if (score < 670) return 'text-yellow-600';
  return 'text-green-600';
}

function maskSSN(ssn: string): string {
  const digits = (ssn || '').replace(/\D/g, '');
  const last4 = digits.slice(-4).padStart(4, '●');
  return `●●●-●●-${last4}`;
}

function isoToMMDDYYYY(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return undefined;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

const ERROR_COPY: Record<string, string> = {
  bureau_auth_failed:
    'Unable to authenticate with the credit bureau. Please contact your administrator.',
  bureau_rejected_request:
    'The credit bureau rejected the request. Please verify all consumer information is correct.',
  bureau_unreachable:
    'Unable to reach the credit bureau service. Please try again in a moment.',
  bureau_service_error:
    'The credit bureau service is currently experiencing issues. Please try again later.',
};

export default function CreditPullButton(props: CreditPullButtonProps) {
  const { applicantId, projectId, applicantName, prefill, index } = props;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('confirm');
  const [bureau, setBureau] = useState<Bureau>('TU');
  const [attested, setAttested] = useState(false);
  const [authRef, setAuthRef] = useState('');
  const [result, setResult] = useState<CreditPullResult | null>(null);
  const [errorCode, setErrorCode] = useState<string>('internal_error');
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [historyOpen, setHistoryOpen] = useState(false);

  // ── Pull history (for the latest-pull badge + history dialog) ───────────
  const [history, setHistory] = useState<CreditPullRow[]>([]);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);

  // ── Authorization gate ──────────────────────────────────────────────────
  // The button is disabled until a signed Zoho "Soft Credit Pull Authorization
  // Form" matching this applicant's name has been received (see
  // /api/credit-pull/authorization). Authorization is permanent once on file.
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const first = (prefill.firstName || '').trim();
    const last = (prefill.lastName || '').trim();
    const dob = (prefill.dateOfBirth || '').trim();
    // Match requires name AND DOB — don't bother asking without both.
    if ((!first && !last) || !dob) {
      setAuthorized(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = `/api/credit-pull/authorization?firstName=${encodeURIComponent(first)}&lastName=${encodeURIComponent(last)}&dob=${encodeURIComponent(dob)}`;
        const res = await authenticatedFetch(url);
        if (!res.ok) return; // leave disabled on error
        const data: { authorized?: boolean } = await res.json();
        if (!cancelled) setAuthorized(Boolean(data.authorized));
      } catch {
        /* network blip — leave the button disabled */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefill.firstName, prefill.lastName, prefill.dateOfBirth]);

  useEffect(() => {
    if (!projectId || !applicantId) return;
    let cancelled = false;
    (async () => {
      try {
        const url = `/api/credit-pull?projectId=${encodeURIComponent(projectId)}&applicantId=${encodeURIComponent(applicantId)}`;
        const res = await authenticatedFetch(url);
        if (!res.ok) return;
        const rows: CreditPullRow[] = await res.json();
        if (!cancelled) setHistory(rows);
      } catch {
        /* network blip — silently skip; badge just won't render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, applicantId, historyReloadKey]);

  const latestPull = useMemo(() => {
    return history.find((r) => r.success && r.isHit) || history[0] || null;
  }, [history]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    setView('pulling');
    try {
      const payload = {
        projectId,
        applicantId,
        bureau,
        firstName: prefill.firstName,
        middleName: prefill.middleName || undefined,
        lastName: prefill.lastName,
        ssn: prefill.ssn,
        dob: isoToMMDDYYYY(prefill.dateOfBirth),
        address: prefill.address,
        city: prefill.city,
        state: prefill.state,
        zip: prefill.zip,
        permissiblePurpose: 'credit_transaction_consumer_initiated' as const,
        consumerAuthorizedAt: new Date().toISOString(),
        consumerAuthorizationRef: authRef.trim() || undefined,
      };

      const res = await authenticatedFetch('/api/credit-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let code = 'internal_error';
        let detail = '';
        try {
          const body = await res.json();
          code = body.error || code;
          detail = body.message || '';
        } catch {
          /* non-JSON body — keep defaults */
        }
        setErrorCode(code);
        setErrorDetail(detail);
        setView('error');
        return;
      }

      const data = (await res.json()) as { pullId: string; result: CreditPullResult };
      setResult(data.result);
      setHistoryReloadKey((k) => k + 1);

      if (!data.result.success) {
        setErrorCode('bureau_service_error');
        setErrorDetail(data.result.errorMessage || '');
        setView('error');
      } else if (data.result.isHit) {
        setView('result');
      } else {
        setView('no-hit');
      }
    } catch (err: any) {
      setErrorCode('internal_error');
      setErrorDetail(err?.message || '');
      setView('error');
    }
  }, [projectId, applicantId, bureau, prefill, authRef]);

  function resetAndClose() {
    setOpen(false);
    setTimeout(() => {
      setView('confirm');
      setAttested(false);
      setAuthRef('');
      setResult(null);
      setErrorCode('internal_error');
      setErrorDetail('');
    }, 200);
  }

  function openFresh() {
    setView('confirm');
    setAttested(false);
    setAuthRef('');
    setResult(null);
    setOpen(true);
  }

  function openHistoricalResult(row: CreditPullRow) {
    const r = (row.parsedSummary as CreditPullResult | null) || null;
    if (!r) return;
    setResult(r);
    setBureau(row.bureau);
    setView(r.isHit && r.success ? 'result' : r.success ? 'no-hit' : 'error');
    if (!r.success) setErrorCode('bureau_service_error');
    setHistoryOpen(false);
    setOpen(true);
  }

  return (
    <>
      {latestPull && latestPull.success && latestPull.isHit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openHistoricalResult(latestPull);
          }}
          className="px-2 py-1 bg-[#f0f4f9] border border-[#c5d4e8] rounded-md text-xs flex items-center gap-1.5 hover:bg-[#e6edf6]"
          data-testid={`badge-credit-pulled-${index + 1}`}
          title="View last credit pull"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#4263a5]" />
          <span className="text-[#4a6fa5]">
            Credit Pulled • {latestPull.bureau} •
          </span>
          <span className={`font-semibold ${scoreColorClass(latestPull.score)}`}>
            {latestPull.score ?? '—'}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openFresh();
        }}
        disabled={!projectId || !authorized}
        className="px-3 py-1.5 bg-[#133c7f] text-white font-medium rounded-md text-xs hover:bg-[#0f3168] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid={`button-soft-credit-pull-${index + 1}`}
        title={
          !projectId
            ? 'Save the project before pulling credit'
            : !authorized
              ? 'Awaiting signed Soft Credit Pull Authorization form for this applicant'
              : 'Soft Credit Pull'
        }
      >
        <CreditCard className="w-3.5 h-3.5" />
        Soft Credit Pull
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          data-testid={`dialog-credit-pull-${index + 1}`}
        >
          <DialogHeader>
            <DialogTitle>Soft Credit Pull — {applicantName}</DialogTitle>
          </DialogHeader>

          {view === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-md border bg-[#fafbfd] p-3 space-y-1 text-sm">
                <div>
                  <span className="text-[#4a6fa5]">Name:</span>{' '}
                  <span className="font-medium" data-testid="text-confirm-name">
                    {prefill.firstName}{' '}
                    {prefill.middleName ? prefill.middleName + ' ' : ''}
                    {prefill.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-[#4a6fa5]">DOB:</span>{' '}
                  <span className="font-medium" data-testid="text-confirm-dob">
                    {isoToMMDDYYYY(prefill.dateOfBirth) || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#4a6fa5]">SSN:</span>{' '}
                  <span className="font-medium font-mono" data-testid="text-confirm-ssn">
                    {maskSSN(prefill.ssn)}
                  </span>
                </div>
                <div>
                  <span className="text-[#4a6fa5]">Address:</span>{' '}
                  <span className="font-medium" data-testid="text-confirm-address">
                    {prefill.address}, {prefill.city}, {prefill.state} {prefill.zip}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Bureau</Label>
                <RadioGroup
                  value={bureau}
                  onValueChange={(v) => setBureau(v as Bureau)}
                  className="mt-2 flex gap-4"
                >
                  {BUREAUS.map((b) => (
                    <div key={b} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={b}
                        id={`bureau-${b}-${index + 1}`}
                        data-testid={`radio-bureau-${b}-${index + 1}`}
                      />
                      <Label
                        htmlFor={`bureau-${b}-${index + 1}`}
                        className="text-sm cursor-pointer font-normal"
                      >
                        {BUREAU_DISPLAY_NAMES[b]} ({b})
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor={`auth-ref-${index + 1}`} className="text-sm font-medium">
                  Authorization reference (signed form ID)
                </Label>
                <Input
                  id={`auth-ref-${index + 1}`}
                  value={authRef}
                  onChange={(e) => setAuthRef(e.target.value)}
                  placeholder="Optional — e.g. DOC-12345"
                  className="mt-1"
                  data-testid={`input-auth-ref-${index + 1}`}
                />
              </div>

              <div className="flex items-start gap-2 rounded-md border border-[#fde68a] bg-[#fef9c3] p-3">
                <Checkbox
                  id={`attest-${index + 1}`}
                  checked={attested}
                  onCheckedChange={(c) => setAttested(c === true)}
                  className="mt-0.5"
                  data-testid={`checkbox-attest-${index + 1}`}
                />
                <Label
                  htmlFor={`attest-${index + 1}`}
                  className="text-xs leading-relaxed cursor-pointer font-normal"
                >
                  I confirm that <strong>{applicantName}</strong> has signed a written
                  authorization for T Bank to obtain their consumer credit report from
                  the selected bureau, for the purpose of evaluating this SBA loan
                  prequalification application.
                </Label>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  onClick={resetAndClose}
                  data-testid={`button-cancel-credit-pull-${index + 1}`}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={!attested}
                  data-testid={`button-submit-credit-pull-${index + 1}`}
                >
                  Pull Credit Report
                </Button>
              </DialogFooter>
            </div>
          )}

          {view === 'pulling' && (
            <div
              className="py-10 flex flex-col items-center justify-center gap-3"
              data-testid="state-credit-pull-loading"
            >
              <Loader2 className="w-8 h-8 animate-spin text-[#133c7f]" />
              <p className="text-sm text-[#4a6fa5]">
                Pulling credit report from {BUREAU_DISPLAY_NAMES[bureau]}…
              </p>
              <p className="text-xs text-[#7da1d4]">This usually takes 5–15 seconds.</p>
            </div>
          )}

          {view === 'result' && result && (
            <div className="space-y-5" data-testid="state-credit-pull-result">
              {/* ── Scores row — one card per model returned by the bureau ── */}
              <ScoreRow result={result} />

              {/* ── Subject identity ── */}
              <SubjectInfoCard result={result} />

              {/* ── Summary counts (up to 8 tiles) ── */}
              <div>
                <SectionLabel>Summary Counts</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <SummaryTile label="Total Trades" value={String(result.totalTrades ?? '—')} />
                  <SummaryTile label="Open Trades" value={fmtNum(result.openAccounts)} />
                  <SummaryTile label="Revolving" value={fmtNum(result.revolvingAccounts)} />
                  <SummaryTile label="Installment" value={fmtNum(result.installmentAccounts)} />
                  <SummaryTile label="Mortgages" value={fmtNum(result.mortgages)} />
                  <SummaryTile label="Hist Neg Trades" value={fmtNum(result.histNegTrades)} />
                  <SummaryTile label="Negative Trades" value={String(result.negativeTrades ?? '—')} />
                  <SummaryTile label="Open Inquiries" value={String(result.inquiries ?? '—')} />
                  <SummaryTile label="Collections" value={String(result.collections ?? '—')} />
                  <SummaryTile label="Public Records" value={String(result.publicRecords ?? '—')} />
                </div>
              </div>

              {/* ── Balances by type (Revolving / Installment / Totals) ── */}
              {(result.summaryByType?.length ?? 0) > 0 && (
                <div>
                  <SectionLabel>Balances by Account Type</SectionLabel>
                  <BalancesTable rows={result.summaryByType!} />
                </div>
              )}

              {/* ── Compliance tiles (OFAC + MLA + SSN match) ── */}
              <div>
                <SectionLabel>Compliance &amp; Identity</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <SummaryTile
                    label="SSN Match"
                    status={result.ssnMatchValue?.toLowerCase().includes('exact') ? 'ok' : 'warn'}
                    value={result.ssnMatchValue || '—'}
                  />
                  <SummaryTile
                    label="OFAC"
                    status={
                      result.ofacStatus && /clear|no/i.test(result.ofacStatus)
                        ? 'ok'
                        : result.ofacStatus
                          ? 'bad'
                          : 'warn'
                    }
                    value={result.ofacStatus || '—'}
                  />
                  <SummaryTile
                    label="MLA"
                    status={
                      result.mlaStatus && /no.?match|clear/i.test(result.mlaStatus)
                        ? 'ok'
                        : result.mlaStatus
                          ? 'bad'
                          : 'warn'
                    }
                    value={result.mlaStatus || '—'}
                  />
                </div>
              </div>

              {/* ── Score factors per model. Falls back to legacy single-model
                   `scoreReasons` when the bureau hasn't been re-pulled since
                   we started capturing `allScores`. ── */}
              {(result.allScores && result.allScores.length > 0) ? (
                <ScoreFactorsByModel allScores={result.allScores} />
              ) : (
                result.scoreReasons.length > 0 && (
                  <div>
                    <SectionLabel>Score Factors</SectionLabel>
                    <ul
                      className="list-disc pl-5 text-sm space-y-0.5"
                      data-testid="list-score-factors"
                    >
                      {result.scoreReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )
              )}

              <div className="text-[11px] text-[#7da1d4] pt-2 border-t">
                Pulled from {BUREAU_DISPLAY_NAMES[result.bureau]} on {result.reportDate || '—'} —
                Transaction ID: {result.transactionId || '—'}
              </div>

              <DialogFooter>
                <Button onClick={resetAndClose} data-testid="button-done-credit-pull">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}

          {view === 'no-hit' && result && (
            <div className="space-y-4" data-testid="state-credit-pull-no-hit">
              <div className="rounded-md border border-[#fde68a] bg-[#fef9c3] p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">
                    No credit file found for <strong>{applicantName}</strong> at{' '}
                    {BUREAU_DISPLAY_NAMES[result.bureau]}.
                  </div>
                  <p className="mt-1 text-[#4a6fa5]">
                    Try pulling from a different bureau, or verify the consumer's SSN,
                    name, and address are correct.
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={resetAndClose}>
                  Close
                </Button>
                <Button onClick={() => setView('confirm')} data-testid="button-try-another-bureau">
                  Try Another Bureau
                </Button>
              </DialogFooter>
            </div>
          )}

          {view === 'error' && (
            <div className="space-y-4" data-testid="state-credit-pull-error">
              <div className="rounded-md border border-red-200 bg-red-50 p-4 flex gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-sm text-red-800 space-y-1">
                  <div>
                    {ERROR_COPY[errorCode] ||
                      'An unexpected error occurred. Please try again or contact support.'}
                  </div>
                  {errorDetail && (
                    <div
                      className="text-xs text-red-700/80"
                      data-testid="text-credit-pull-error-detail"
                    >
                      {errorDetail}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={resetAndClose}>
                  Close
                </Button>
                <Button onClick={() => setView('confirm')} data-testid="button-try-again-credit-pull">
                  Try Again
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History list — collapsible inline */}
      {history.length > 0 && (
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Credit Pull History — {applicantName}</DialogTitle>
            </DialogHeader>
            <div className="divide-y border rounded-md">
              {history.map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => openHistoricalResult(row)}
                  className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#f6f8fb]"
                  data-testid={`row-credit-pull-history-${row.id}`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {new Date(row.pulledAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-[#4a6fa5]">{row.initiatedByUserId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{row.bureau}</Badge>
                    {row.success && row.isHit ? (
                      <span className={`font-semibold ${scoreColorClass(row.score)}`}>
                        {row.score ?? '—'}
                      </span>
                    ) : row.success ? (
                      <span className="text-xs text-yellow-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        No hit
                      </span>
                    ) : (
                      <span className="text-xs text-red-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        Error
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function SummaryTile({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: 'ok' | 'warn' | 'bad';
}) {
  const icon =
    status === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> :
    status === 'bad' ? <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> :
    status === 'warn' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" /> :
    null;
  return (
    <div className="rounded-md border bg-[#fafbfd] p-2">
      <div className="text-[10px] uppercase tracking-wide text-[#7da1d4] flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

// ─── Expanded-result helpers ───────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold text-[#4a6fa5] uppercase tracking-wide mb-1.5">
      {children}
    </div>
  );
}

function fmtNum(n: number | null | undefined): string {
  return n == null ? '—' : String(n);
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Top-of-dialog score strip. Falls back to the legacy single-score block when
 * the result was captured before we started emitting `allScores` (older Cosmos
 * rows, viewed from the history badge).
 */
function ScoreRow({ result }: { result: CreditPullResult }) {
  const allScores = result.allScores ?? [];
  if (allScores.length === 0) {
    return (
      <div className="flex flex-col items-center py-2">
        <div
          className={`text-6xl font-bold ${scoreColorClass(result.score)}`}
          data-testid="text-credit-score"
        >
          {result.score ?? '—'}
        </div>
        <div className="text-xs text-[#4a6fa5] mt-1">
          {result.scoreModel || 'Unknown model'}
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="credit-pull-scores-row">
      {allScores.map((s, i) => (
        <div
          key={i}
          className="rounded-md border bg-[#fafbfd] px-3 py-3 text-center"
          data-testid={`credit-pull-score-${i}`}
        >
          <div className="text-[10px] uppercase tracking-wide text-[#7da1d4] mb-1">
            {s.model}
          </div>
          <div className={`text-3xl font-bold ${scoreColorClass(s.score)}`}>
            {s.score ?? s.scoreRaw ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Subject identity block — name + address + DOB + file-hit text + infile-since.
 * Quietly renders nothing when none of the fields came back (older rows).
 */
function SubjectInfoCard({ result }: { result: CreditPullResult }) {
  const anything =
    result.subjectName ||
    result.subjectAddress ||
    result.subjectSsnMasked ||
    result.subjectDob ||
    result.infileSince ||
    result.fileHitText;
  if (!anything) return null;
  return (
    <div>
      <SectionLabel>Subject Identity</SectionLabel>
      <div className="rounded-md border bg-[#fafbfd] p-3 text-sm space-y-1">
        {result.subjectName && (
          <Row label="Name" value={result.subjectName} testId="text-subject-name" />
        )}
        {result.subjectAddress && (
          <Row label="Address" value={result.subjectAddress} testId="text-subject-address" />
        )}
        {(result.subjectSsnMasked || result.subjectDob) && (
          <div className="flex gap-6">
            {result.subjectSsnMasked && (
              <Row label="SSN" value={result.subjectSsnMasked} mono />
            )}
            {result.subjectDob && <Row label="DOB" value={result.subjectDob} />}
          </div>
        )}
        {result.fileHitText && (
          <Row label="File Hit" value={result.fileHitText} testId="text-file-hit" />
        )}
        {result.infileSince && (
          <Row label="Infile Since" value={result.infileSince} testId="text-infile-since" />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  testId,
}: {
  label: string;
  value: string;
  mono?: boolean;
  testId?: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-[#4a6fa5] min-w-[88px]">{label}:</span>
      <span
        className={`font-medium ${mono ? 'font-mono' : ''}`}
        data-testid={testId}
      >
        {value}
      </span>
    </div>
  );
}

function BalancesTable({ rows }: { rows: CreditPullResult['summaryByType'] }) {
  if (!rows) return null;
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="bg-[#f0f4f9] text-[#4a6fa5]">
          <tr>
            <th className="text-left py-2 px-3 font-medium">Type</th>
            <th className="text-right py-2 px-3 font-medium">High</th>
            <th className="text-right py-2 px-3 font-medium">Limit</th>
            <th className="text-right py-2 px-3 font-medium">Balance</th>
            <th className="text-right py-2 px-3 font-medium">Past Due</th>
            <th className="text-right py-2 px-3 font-medium">Payment</th>
            <th className="text-right py-2 px-3 font-medium">% Avail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t" data-testid={`balances-row-${i}`}>
              <td className="py-2 px-3 font-medium">{r.type}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtCurrency(r.highCredit)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtCurrency(r.creditLimit)}</td>
              <td className="py-2 px-3 text-right tabular-nums">{fmtCurrency(r.balance)}</td>
              <td className="py-2 px-3 text-right tabular-nums">
                {fmtCurrency(r.amountPastDue)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                {fmtCurrency(r.monthlyPayment)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                {r.percentAvailable == null ? '—' : `${r.percentAvailable}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreFactorsByModel({ allScores }: { allScores: CreditPullScoreModel[] }) {
  const withFactors = allScores.filter((s) => s.factors.length > 0);
  if (withFactors.length === 0) return null;
  return (
    <div>
      <SectionLabel>Score Factors</SectionLabel>
      <div className="space-y-3">
        {withFactors.map((s, i) => (
          <div key={i} data-testid={`score-factors-${i}`}>
            <div className="text-[11px] font-semibold text-[#1a1a1a]">
              {s.model}
              {s.score != null && (
                <span className={`ml-2 ${scoreColorClass(s.score)}`}>
                  {s.score}
                </span>
              )}
            </div>
            <ul className="list-disc pl-5 text-sm space-y-0.5 mt-0.5">
              {s.factors.map((f, j) => (
                <li key={j}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
