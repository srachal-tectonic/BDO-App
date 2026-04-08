'use client';

import CollapsibleSection from '@/components/loan-sections/CollapsibleSection';
import { useApplication } from '@/lib/applicationStore';

export default function ReviewSection() {
  const { data } = useApplication();
  const {
    projectOverview: rawProjectOverview,
    individualApplicants,
    businessApplicant: rawBusinessApplicant,
    sellerInfo: rawSellerInfo
  } = data;

  // Provide safe defaults
  const projectOverview = rawProjectOverview || { projectName: '', industry: '', naicsCode: '', primaryProjectPurpose: '' };
  const businessApplicant = rawBusinessApplicant || { legalName: '', entityType: '', ein: '' };
  const sellerInfo = rawSellerInfo || { legalName: '', businessDescription: '' };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[color:var(--t-color-text-body)]">Review & Submit</h1>
      </div>

      <div className="px-4 sm:px-6">
        <CollapsibleSection title="Project Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Project Name</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]" data-testid="review-project-name">
                {projectOverview.projectName || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Industry</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]" data-testid="review-industry">
                {projectOverview.industry || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">NAICS Code</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]" data-testid="review-naics">
                {projectOverview.naicsCode || '—'}
              </p>
            </div>
          </div>
          {projectOverview.projectDescription && (
            <div className="mt-4">
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Description</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]" data-testid="review-description">
                {projectOverview.projectDescription}
              </p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Individual Applicants">
          {individualApplicants.map((applicant, index) => (
            <div key={applicant.id} className="mb-6 pb-6 border-b border-[var(--t-color-border)] last:border-0">
              <h3 className="font-semibold text-[color:var(--t-color-text-body)] mb-3">Applicant {index + 1}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Name</p>
                  <p className="text-[15px] text-[color:var(--t-color-text-body)]">
                    {applicant.firstName} {applicant.lastName || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Email</p>
                  <p className="text-[15px] text-[color:var(--t-color-text-body)]">{applicant.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Phone</p>
                  <p className="text-[15px] text-[color:var(--t-color-text-body)]">{applicant.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Ownership %</p>
                  <p className="text-[15px] text-[color:var(--t-color-text-body)]">{applicant.ownershipPercentage}%</p>
                </div>
              </div>

              {/* Document uploads section for this applicant */}
              <div className="mt-4 pt-4 border-t border-[var(--t-color-border)]">
                <p className="text-sm font-semibold text-[color:var(--t-color-text-body)] mb-2">Documents</p>
                <div className="bg-[#f9fafb] border border-[var(--t-color-border)] rounded-lg p-4">
                  <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-2">
                    To view uploaded documents for this applicant, please navigate back to the Individual Applicants section.
                  </p>
                  <p className="text-xs text-[color:var(--t-color-text-muted)]">
                    Expected documents: Tax Returns (3 years), Personal Financial Statement, Resume, Other Files
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Business Applicant">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Legal Name</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]" data-testid="review-business-name">
                {businessApplicant.legalName || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Entity Type</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]">
                {businessApplicant.entityType || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Email</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]">{businessApplicant.email || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Phone</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]">{businessApplicant.phone || '—'}</p>
            </div>
          </div>

          {/* Document uploads section */}
          <div className="mt-4 pt-4 border-t border-[var(--t-color-border)]">
            <p className="text-sm font-semibold text-[color:var(--t-color-text-body)] mb-2">Business Documents</p>
            <div className="bg-[#f9fafb] border border-[var(--t-color-border)] rounded-lg p-4">
              <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-2">
                To view uploaded business documents, please navigate back to the Business Applicant section.
              </p>
              <p className="text-xs text-[color:var(--t-color-text-muted)]">
                Expected documents: Federal Tax Returns (3 years), Interim Income Statement, Interim Balance Sheet, Other Files
              </p>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Project Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Legal Name</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]" data-testid="review-seller-name">
                {sellerInfo.legalName || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Contact Name</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]">{sellerInfo.sellerName || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Phone</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)]">{sellerInfo.sellerPhone || '—'}</p>
            </div>
          </div>

          {/* Business Description */}
          {sellerInfo.businessDescription && (
            <div className="mt-4">
              <p className="text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Business Description</p>
              <p className="text-[15px] text-[color:var(--t-color-text-body)] whitespace-pre-wrap">{sellerInfo.businessDescription}</p>
            </div>
          )}

          {/* Document uploads section */}
          <div className="mt-4 pt-4 border-t border-[var(--t-color-border)]">
            <p className="text-sm font-semibold text-[color:var(--t-color-text-body)] mb-2">Seller Documents</p>
            <div className="bg-[#f9fafb] border border-[var(--t-color-border)] rounded-lg p-4">
              <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-2">
                To view uploaded seller documents, please navigate back to the Project Information section.
              </p>
              <p className="text-xs text-[color:var(--t-color-text-muted)]">
                Expected documents: Business Federal Tax Returns (3 years), Other Files
              </p>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
