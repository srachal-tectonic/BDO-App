import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { logAuditEvent } from '@/lib/auditLog';
import { diffObjects, diffArrayById } from '@/lib/auditDiff';
import { FIELD_LABELS } from '@/lib/fieldLabels';

// GET /api/projects/:id/loan-application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const col = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const doc = await col.findOne({ projectId });

    if (!doc) {
      return NextResponse.json(null);
    }
    // Strip MongoDB metadata
    const { _id, ...appData } = doc;
    return NextResponse.json(appData);
  } catch (error: any) {
    console.error('Error fetching loan application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/projects/:id/loan-application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const applicationData = await request.json();
    const col = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);

    // Fetch existing for diff (skip no-op saves from auto-save)
    const existing = await col.findOne({ projectId });

    await col.updateOne(
      { projectId },
      {
        $set: {
          ...applicationData,
          projectId,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    // Audit: diff old vs new, only log if actual changes exist
    if (existing) {
      const { _id, ...oldData } = existing as any;
      const allChanges = [];

      // Diff individual applicants array separately
      const oldApplicants = oldData.individualApplicants || [];
      const newApplicants = applicationData.individualApplicants || [];
      if (oldApplicants.length || newApplicants.length) {
        const applicantChanges = diffArrayById(
          oldApplicants,
          newApplicants,
          'individualApplicants',
          (a: any) => `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.id,
          FIELD_LABELS,
        );
        allChanges.push(...applicantChanges);
      }

      // Diff financing sources array separately
      const oldSources = oldData.financingSources || [];
      const newSources = applicationData.financingSources || [];
      if (oldSources.length || newSources.length) {
        const sourceChanges = diffArrayById(
          oldSources,
          newSources,
          'financingSources',
          (s: any) => s.financingType || s.id,
          FIELD_LABELS,
        );
        allChanges.push(...sourceChanges);
      }

      // Diff the rest of the object (excluding arrays we already handled)
      const { individualApplicants: _oia, financingSources: _ofs, ...oldRest } = oldData;
      const { individualApplicants: _nia, financingSources: _nfs, ...newRest } = applicationData;
      const scalarChanges = diffObjects(oldRest, newRest, FIELD_LABELS);
      allChanges.push(...scalarChanges);

      if (allChanges.length > 0) {
        logAuditEvent({
          action: 'loan_application_updated',
          category: 'loan_application',
          projectId,
          resourceType: 'loanApplication',
          resourceId: projectId,
          summary: `Updated ${allChanges.length} field(s): ${allChanges.slice(0, 5).map(c => c.label).join(', ')}${allChanges.length > 5 ? ` (+${allChanges.length - 5} more)` : ''}`,
          changes: allChanges,
        }).catch(() => {});
      }
    } else {
      // First save — log creation
      logAuditEvent({
        action: 'loan_application_updated',
        category: 'loan_application',
        projectId,
        resourceType: 'loanApplication',
        resourceId: projectId,
        summary: `Loan application created for project ${projectId}`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving loan application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
