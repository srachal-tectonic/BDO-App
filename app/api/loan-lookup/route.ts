import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from '@/lib/rateLimit';

const LOANSTAR_BASE_URL =
  'https://tbank-lending.mendixcloud.com/rest/loanstar/v1/loandetail';

interface StaffMemberRole {
  Role?: string;
  StaffMember?: { FullName?: string };
}

/**
 * GET /api/loan-lookup?loanid=<id>
 * Proxies a request to the LoanStar (Mendix) loan-detail endpoint and reshapes
 * the response into the fields the PQ Memo / Project Overview consumes.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'loan-lookup',
    RATE_LIMITS.standard,
  );
  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  const loanId = request.nextUrl.searchParams.get('loanid');
  if (!loanId) {
    return NextResponse.json(
      { message: 'loanid query parameter is required' },
      { status: 400 },
    );
  }

  const token = process.env.LOANSTAR_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { message: 'LoanStar API token is not configured' },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${LOANSTAR_BASE_URL}?loanid=${encodeURIComponent(loanId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          message: `LoanStar API error: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    const staffRoles: StaffMemberRole[] = data.StaffMemberRoles || [];
    const bdo1 = staffRoles.find((s) => s.Role === 'BDO');
    const bdo2 = staffRoles.find((s) => s.Role === 'BDO2');

    // RateSpread can come back as 0 or missing; derive it from TotalRate - Index when needed.
    const rateSpread =
      data.RateSpread != null && data.RateSpread !== 0
        ? Number(data.RateSpread)
        : data.Index != null && data.TotalRate != null && data.Index > 0
        ? Number((data.TotalRate - data.Index).toFixed(4))
        : data.RateSpread;

    const result = {
      loanId: data.LoanId,
      loanName: data.LoanName ?? null,
      loanAmount: data.LoanAmount ?? null,
      loanType: data.LoanType?.DisplayName ?? null,
      loanStage: data.LoanStage?.DisplayName ?? null,
      loanStatus: data.LoanStatus?.DisplayName ?? data.LoanStatus ?? null,
      firstDeedOfTrustAmount: data.FirstDeedOfTrustAmount ?? null,
      termYears: data.TermYears ?? null,
      rateSpread,
      brokerFeePercentage: data.BrokerFeePercentage ?? null,
      gtyPercent: data.GTYPercent ?? null,
      craEligible: data.CRAEligible ?? null,
      noteRate: data.TotalRate ?? null,
      debentureAmount: data.DebentureAmount ?? null,
      disbursementType: data.DisbursementType ?? null,
      disbursementStatus: data.DisbursementStatus ?? null,
      isConstruction: data.IsConstruction ?? null,
      isStartUp: data.IsStartUp ?? null,
      isFranchise: data.Franchise ?? null,
      naicsCode:
        data.BusinessLoanJoins?.[0]?.Business?.NAICS?.NaicsCode ??
        data.BusinessLoanJoins?.[0]?.Business?.IndustryCode ??
        null,
      bookedLoanNumber: data.BookedLoanNumber ?? null,
      bdo1Name: bdo1?.StaffMember?.FullName ?? '',
      bdo2Name: bdo2?.StaffMember?.FullName ?? '',
      dateUnderwriterAssigned: data.DateUnderwritterAssigned ?? null,
      dateSubmittedForDecision: data.DateSubmittedForDecision ?? null,
      dateSubmittedForClosing: data.DateSubmittedForClosing ?? null,
      dateEstimatedClosing: data.DateEstimatedClosing ?? null,
      dateLoanClosing: data.DateOfLoanClosing ?? null,
      dateFullyFunded: data.DateFullyFunded ?? null,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to fetch loan details' },
      { status: 500 },
    );
  }
}
