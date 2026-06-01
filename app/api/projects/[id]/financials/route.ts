import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { parseFinancialSpreadsheet, type GuarantorDraw } from '@/lib/parseSpreadsheet';
import { ObjectId } from 'mongodb';
import { logAuditEvent } from '@/lib/auditLog';

/**
 * Normalise a person's name for fuzzy equality: strip punctuation, collapse
 * whitespace, lowercase. "John A. Smith" → "john a smith"; "Smith, John" →
 * "smith john".
 */
function normalizeName(s: string): string {
  return s.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Match a name from column B of the Guarantors sheet against the
 * individualApplicants array. Tolerates: "First Last", "First Middle Last",
 * "Last First", "Last, First", punctuation differences (periods, hyphens),
 * and extra whitespace. Returns the matching applicant index or -1.
 */
function findIndividualIdxByName(applicants: any[], rawName: string): number {
  const raw = String(rawName || '').trim();
  if (!raw) return -1;

  const targets = new Set<string>();
  targets.add(normalizeName(raw));
  // "Last, First [Middle]" → also try "First [Middle] Last".
  if (raw.includes(',')) {
    const [lastPart, ...rest] = raw.split(',');
    const firstPart = rest.join(',').trim();
    if (lastPart.trim() && firstPart) {
      targets.add(normalizeName(`${firstPart} ${lastPart}`));
    }
  }

  return applicants.findIndex((a) => {
    const fn = String(a?.firstName || '').trim();
    const mn = String(a?.middleName || '').trim();
    const ln = String(a?.lastName || '').trim();
    if (!fn && !ln) return false;
    const variants = [
      `${fn} ${ln}`,
      mn ? `${fn} ${mn} ${ln}` : '',
      `${ln} ${fn}`,
      `${ln}, ${fn}`,
    ]
      .map(normalizeName)
      .filter(Boolean);
    return variants.some((v) => targets.has(v));
  });
}

/**
 * Apply parsed spread values to the individualApplicants array on the
 * loan-application doc (all stored as strings per schema.ts):
 *   - `reqDraw`     ("Required Income from Business", Guarantors col AB) — set on
 *                   the applicant matched by name.
 *   - `pcLiquidity` ("Post-Close Liquidity") — the single project-level total
 *                   from the BDO Prequal sheet, set on EVERY applicant (per the
 *                   "same value on every row" requirement). Skipped when null.
 * Only writes when a value would actually change; `updated` counts applicants
 * touched. Net Worth is intentionally not handled here — it derives from each
 * applicant's PFS (see lib/pfsNetWorth.ts).
 *
 * Safe to call when no loan application / no applicants exist (returns zeros).
 */
async function applySpreadValuesToIndividuals(
  projectId: string,
  draws: GuarantorDraw[],
  postCloseLiquidity: number | null,
): Promise<{ matched: number; updated: number; unmatchedNames: string[] }> {
  const hasDraws = Array.isArray(draws) && draws.length > 0;
  if (!hasDraws && postCloseLiquidity == null) {
    return { matched: 0, updated: 0, unmatchedNames: [] };
  }
  const loanCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
  const doc = (await loanCol.findOne({ projectId })) as any;
  const fallbackUnmatched = hasDraws ? draws.map((d) => d.name) : [];
  if (!doc) return { matched: 0, updated: 0, unmatchedNames: fallbackUnmatched };

  const applicants: any[] = Array.isArray(doc.individualApplicants) ? doc.individualApplicants : [];
  if (applicants.length === 0) {
    return { matched: 0, updated: 0, unmatchedNames: fallbackUnmatched };
  }

  const updated = applicants.map((a) => ({ ...a }));
  const unmatchedNames: string[] = [];
  const changedIdx = new Set<number>();
  let matched = 0;

  // Required Income From Business — per matched guarantor.
  for (const draw of draws || []) {
    const idx = findIndividualIdxByName(updated, draw.name);
    if (idx === -1) {
      unmatchedNames.push(draw.name);
      continue;
    }
    matched++;
    const newDraw = draw.reqDraw == null ? '' : String(draw.reqDraw);
    if (String(updated[idx].reqDraw ?? '') !== newDraw) {
      updated[idx].reqDraw = newDraw;
      changedIdx.add(idx);
    }
  }

  // Post-Close Liquidity — same project-level total on every applicant.
  if (postCloseLiquidity != null) {
    const newPcl = String(postCloseLiquidity);
    updated.forEach((a, i) => {
      if (String(a.pcLiquidity ?? '') !== newPcl) {
        a.pcLiquidity = newPcl;
        changedIdx.add(i);
      }
    });
  }

  if (changedIdx.size > 0) {
    await loanCol.updateOne(
      { projectId },
      { $set: { individualApplicants: updated, updatedAt: new Date().toISOString() } },
    );
  }
  return { matched, updated: changedIdx.size, unmatchedNames };
}

// GET /api/projects/:id/financials
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    const spreads = await col.find({ projectId }).sort({ uploadedAt: -1 }).toArray();

    return NextResponse.json(spreads.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest })));
  } catch (error) {
    console.error('[Financials API] Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/projects/:id/financials — upload + parse a spreadsheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const versionLabel = formData.get('versionLabel') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!versionLabel?.trim()) {
      return NextResponse.json({ error: 'Version label is required' }, { status: 400 });
    }

    // Read file into buffer and parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsed;
    try {
      parsed = parseFinancialSpreadsheet(buffer);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: `Failed to parse spreadsheet: ${parseErr.message}` },
        { status: 422 }
      );
    }

    const doc = {
      projectId,
      versionLabel: versionLabel.trim(),
      fileName: file.name,
      isActive: false,
      uploadedAt: new Date().toISOString(),
      periodData: parsed.periods,
      financingSources: parsed.financingSources,
      sourcesUses: parsed.sourcesUses,
      sourcesUsesHeaders: parsed.sourcesUsesHeaders,
      debtServiceLines: parsed.debtServiceLines,
      // Persist the parsed values that feed the Key Individuals table so
      // activating this spread later can re-apply them (see the PATCH handler):
      //   guarantorDraws    — per-name Required Income From Business (col AB)
      //   postCloseLiquidity — project-level Post-Close Liquidity (BDO Prequal I)
      guarantorDraws: parsed.guarantorDraws,
      postCloseLiquidity: parsed.postCloseLiquidity,
    };

    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    const result = await col.insertOne(doc as any);

    // Audit: spread uploaded
    logAuditEvent({
      action: 'spread_uploaded',
      category: 'financial',
      projectId,
      resourceType: 'financialSpread',
      resourceId: result.insertedId.toString(),
      summary: `Uploaded financial spread "${versionLabel.trim()}" (${file.name})`,
      metadata: { fileName: file.name, versionLabel: versionLabel.trim() },
    }).catch(() => {});

    // Push spread values onto individualApplicants: Required Income From Business
    // (Guarantors col AB, matched by name) and Post-Close Liquidity (BDO Prequal
    // sheet, same total on every row). Failures here don't fail the upload — the
    // spread is already saved.
    let guarantorDrawSync: { matched: number; updated: number; unmatchedNames: string[] } = {
      matched: 0,
      updated: 0,
      unmatchedNames: [],
    };
    try {
      guarantorDrawSync = await applySpreadValuesToIndividuals(
        projectId,
        parsed.guarantorDraws || [],
        parsed.postCloseLiquidity,
      );
      if (guarantorDrawSync.updated > 0) {
        logAuditEvent({
          action: 'loan_application_updated',
          category: 'loan_application',
          projectId,
          resourceType: 'loanApplication',
          resourceId: projectId,
          summary: `Synced "Required Income from Business" and "Post-Close Liquidity" on ${guarantorDrawSync.updated} individual applicant(s) from spread`,
          metadata: {
            sourceFile: file.name,
            matched: guarantorDrawSync.matched,
            updated: guarantorDrawSync.updated,
            unmatched: guarantorDrawSync.unmatchedNames,
          },
        }).catch(() => {});
      }
    } catch (applyErr: any) {
      console.error('[Financials API] spread-value apply failed:', applyErr);
    }

    return NextResponse.json({
      id: result.insertedId.toString(),
      ...doc,
      guarantorDrawSync,
    });
  } catch (error: any) {
    console.error('[Financials API POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id/financials?spreadId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const spreadId = request.nextUrl.searchParams.get('spreadId');

    if (!spreadId) {
      return NextResponse.json({ error: 'spreadId is required' }, { status: 400 });
    }

    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    await col.deleteOne({ _id: new ObjectId(spreadId), projectId });

    // Audit: spread deleted
    logAuditEvent({
      action: 'spread_deleted',
      category: 'financial',
      projectId,
      resourceType: 'financialSpread',
      resourceId: spreadId,
      summary: `Deleted financial spread ${spreadId}`,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Financials API DELETE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:id/financials — toggle isActive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { spreadId, isActive } = await request.json();

    if (!spreadId) {
      return NextResponse.json({ error: 'spreadId is required' }, { status: 400 });
    }

    const col = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);

    // If activating, deactivate all others first
    if (isActive) {
      await col.updateMany({ projectId }, { $set: { isActive: false } });
    }

    await col.updateOne(
      { _id: new ObjectId(spreadId), projectId },
      { $set: { isActive: !!isActive } }
    );

    // On activation, re-apply this spread's values (Required Income From Business
    // and Post-Close Liquidity) to the individual applicants so the Key
    // Individuals table reflects whichever spread is active. Older spreads
    // uploaded before these were persisted simply have nothing to apply.
    // Failures here don't fail the activation.
    let guarantorDrawSync: { matched: number; updated: number; unmatchedNames: string[] } = {
      matched: 0,
      updated: 0,
      unmatchedNames: [],
    };
    if (isActive) {
      try {
        const spread = (await col.findOne({ _id: new ObjectId(spreadId), projectId })) as any;
        const draws: GuarantorDraw[] = Array.isArray(spread?.guarantorDraws)
          ? spread.guarantorDraws
          : [];
        const postCloseLiquidity: number | null =
          typeof spread?.postCloseLiquidity === 'number' ? spread.postCloseLiquidity : null;
        guarantorDrawSync = await applySpreadValuesToIndividuals(projectId, draws, postCloseLiquidity);
        if (guarantorDrawSync.updated > 0) {
          logAuditEvent({
            action: 'loan_application_updated',
            category: 'loan_application',
            projectId,
            resourceType: 'loanApplication',
            resourceId: projectId,
            summary: `Synced "Required Income from Business" and "Post-Close Liquidity" on ${guarantorDrawSync.updated} individual applicant(s) from activated spread`,
            metadata: {
              spreadId,
              matched: guarantorDrawSync.matched,
              updated: guarantorDrawSync.updated,
              unmatched: guarantorDrawSync.unmatchedNames,
            },
          }).catch(() => {});
        }
      } catch (applyErr: any) {
        console.error('[Financials API PATCH] spread-value apply failed:', applyErr);
      }
    }

    // Audit: spread activated/deactivated
    logAuditEvent({
      action: isActive ? 'spread_activated' : 'spread_deactivated',
      category: 'financial',
      projectId,
      resourceType: 'financialSpread',
      resourceId: spreadId,
      summary: `${isActive ? 'Activated' : 'Deactivated'} financial spread ${spreadId}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, guarantorDrawSync });
  } catch (error: any) {
    console.error('[Financials API PATCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
