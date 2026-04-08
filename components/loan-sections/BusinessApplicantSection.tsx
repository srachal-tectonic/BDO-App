'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApplication } from '@/lib/applicationStore';
import AddressInput from '@/components/loan-sections/AddressInput';
import PasswordToggle from '@/components/loan-sections/PasswordToggle';
import { HelpCircle, ChevronDown, Trash2, Upload, Loader2 } from 'lucide-react';
import type { IndividualApplicant } from '@/lib/schema';

interface BusinessApplicantSectionProps {
  onLearnMore?: (title: string, content: string) => void;
  projectId?: string;
  isBDO?: boolean;
}

export default function BusinessApplicantSection({ onLearnMore, projectId, isBDO = true }: BusinessApplicantSectionProps) {
  const { data, updateBusinessApplicant, updateIndividualApplicant, addIndividualApplicant, removeIndividualApplicant } = useApplication();
  const { businessApplicant: rawBusinessApplicant, individualApplicants } = data;
  const businessApplicant = rawBusinessApplicant || {} as any;
  const router = useRouter();

  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const updateApplicant = (id: string, field: keyof IndividualApplicant, value: any) => {
    updateIndividualApplicant(id, { [field]: value } as any);
  };

  const handleAddApplicant = () => {
    addIndividualApplicant();
  };

  return (
    <div>
      <div className="p-4 pb-2 flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-[color:var(--t-color-primary)] uppercase tracking-wider">Business Applicant</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-1.5 bg-[var(--t-color-warning-bg)] border border-[var(--t-color-warning-light)] rounded-lg inline-flex flex-shrink-0">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={businessApplicant.entityToBeFormed || false}
                onChange={(e) => updateBusinessApplicant({ entityToBeFormed: e.target.checked })}
                className="w-4 h-4 cursor-pointer accent-[var(--t-color-accent)]"
                data-testid="checkbox-entity-to-be-formed"
              />
              <span className="text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)]">
                Entity to be Formed
              </span>
            </label>
          </div>
        </div>
      </div>

      {!isBDO && (
        <div className="px-4 mb-3">
          <div className="bg-[var(--t-color-page-bg)] border border-[var(--t-color-border)] rounded-lg p-4 sm:p-5">
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            >
              <ChevronDown
                className={`w-5 h-5 text-[color:var(--t-color-text-muted)] transition-transform flex-shrink-0 mt-0.5 ${
                  descriptionExpanded ? 'rotate-180' : ''
                }`}
              />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[color:var(--t-color-text-body)] mb-1">About This Section</h3>
                {descriptionExpanded && (
                  <div className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] leading-relaxed mt-2">
                    <p className="mb-3">
                      Enter information about the <strong>business that is applying for this SBA loan</strong>. This is the company that will borrow the funds, sign the loan documents, and be responsible for repayment.
                    </p>
                    <ul className="list-disc ml-6 space-y-2 mb-3">
                      <li>In a <strong>business acquisition</strong>, the Business Applicant is <strong>your company (the buyer)</strong> – not the company you are purchasing.</li>
                      <li>The Business Applicant can be an <strong>existing business</strong> or a <strong>new entity you are forming</strong> for the acquisition or project.</li>
                    </ul>
                    <p>If the borrowing company has not been formed yet, check <strong>&quot;Entity to be Formed.&quot;</strong></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {/* Entity Details */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className="bg-[var(--t-color-primary-palest)] px-4 py-1.5">
            <h4 className="text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)]">Entity Details</h4>
          </div>
          <div className="px-4 py-3 space-y-2">
            {/* Legal Business Name and DBA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                  Legal Business Name <span className="font-normal text-[color:var(--t-color-text-muted)]">(Must match entity formation documents)</span>
                </label>
                <input
                  type="text"
                  value={businessApplicant.legalName || ''}
                  onChange={(e) => updateBusinessApplicant({ legalName: e.target.value })}
                  placeholder="Enter legal business name"
                  className="w-full px-3 py-1.5 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] transition-all focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)]"
                  data-testid="input-legal-business-name"
                />
              </div>
              <div>
                <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2 flex items-center gap-2">
                  DBA or Trade Name
                </label>
                <input
                  type="text"
                  value={businessApplicant.dba || ''}
                  onChange={(e) => updateBusinessApplicant({ dba: e.target.value })}
                  placeholder="Enter DBA or trade name (if applicable)"
                  className="w-full px-3 py-1.5 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] transition-all focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)]"
                  data-testid="input-dba-name"
                />
              </div>
            </div>

            {/* Entity Type, TIN, and Website */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">Entity Type</label>
                <select
                  value={businessApplicant.entityType || ''}
                  onChange={(e) => updateBusinessApplicant({ entityType: e.target.value })}
                  className="w-full px-3 py-1.5 pr-11 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] transition-all focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center]"
                  data-testid="select-entity-type"
                >
                  <option value="">Choose an item.</option>
                  <option value="cooperative">Cooperative</option>
                  <option value="corporation">Corporation</option>
                  <option value="llc">Limited Liability Company (LLC)</option>
                  <option value="llp">Limited Liability Partnership</option>
                  <option value="partnership">Partnership</option>
                  <option value="sole-proprietor">Sole Proprietorship</option>
                  <option value="s-corp">Subchapter S Corporation</option>
                  <option value="trust">Trust</option>
                </select>
              </div>
              <div>
                <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">Business TIN (EIN/SSN)</label>
                <PasswordToggle
                  id="business-tin"
                  value={businessApplicant.ein || ''}
                  onChange={(value) => updateBusinessApplicant({ ein: value })}
                  placeholder="XX-XXXXXXX"
                  testId="input-business-ein"
                />
              </div>
              <div>
                <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">Business Website Address</label>
                <input
                  type="url"
                  value={businessApplicant.website || ''}
                  onChange={(e) => updateBusinessApplicant({ website: e.target.value })}
                  placeholder="https://www.example.com"
                  className="w-full px-3 py-1.5 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] transition-all focus:border-[var(--t-color-primary)] focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)]"
                  data-testid="input-business-website"
                />
              </div>
            </div>

            {/* Business Address */}
            <div className="mb-2">
              <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">Business Address</label>
              <AddressInput
                value={businessApplicant.businessAddress}
                onChange={(addr) => updateBusinessApplicant({ businessAddress: addr })}
                idPrefix="business-address"
              />
            </div>

            {/* Project Address */}
            <div className="mb-2">
              <label className="block text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-text-body)] mb-2">Project Address, If Different from Business Address</label>
              <AddressInput
                value={businessApplicant.projectAddress}
                onChange={(addr) => updateBusinessApplicant({ projectAddress: addr })}
                idPrefix="project-address"
              />
            </div>
          </div>
        </div>

        {/* Ownership of Applicant Table */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-md overflow-hidden">
          <div className="bg-[var(--t-color-primary-palest)] px-4 py-1.5">
            <h4 className="text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)]">Ownership of Applicant</h4>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="bg-[var(--t-color-info-bg)] border border-[var(--t-color-info-border)] rounded-lg p-4 mb-2">
              <p className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-primary)]">
                <span className="font-semibold">NOTE:</span> Identify all owners of the Applicant Business, including officers, directors, and minority owners. The combined ownership percentages <span className="font-bold">must equal 100%</span>.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" data-testid="ownership-table">
                <thead>
                  <tr className="bg-[var(--t-color-primary)] text-white">
                    <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium">Owner&apos;s Legal Name (First Name and Last Name)</th>
                    <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium">Ownership</th>
                    <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium">Direct / Indirect</th>
                    <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium">Project Role</th>
                    <th className="border border-[var(--t-color-border)] px-3 py-2 text-left font-medium">Role in Business Operations</th>
                    <th className="border border-[var(--t-color-border)] px-2 py-2 text-center font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {individualApplicants.map((applicant) => (
                    <tr key={applicant.id} className="bg-white" data-testid={`ownership-row-${applicant.id}`}>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={applicant.firstName || ''}
                            onChange={(e) => updateApplicant(applicant.id, 'firstName', e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-[color:var(--t-color-text-body)] min-w-0"
                            placeholder="First Name"
                            data-testid={`ownership-firstname-${applicant.id}`}
                          />
                          <input
                            type="text"
                            value={applicant.lastName || ''}
                            onChange={(e) => updateApplicant(applicant.id, 'lastName', e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-[color:var(--t-color-text-body)] min-w-0"
                            placeholder="Last Name"
                            data-testid={`ownership-lastname-${applicant.id}`}
                          />
                        </div>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={applicant.ownershipPercentage || ''}
                            onChange={(e) => updateApplicant(applicant.id, 'ownershipPercentage', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-transparent border-none outline-none text-[color:var(--t-color-text-body)] text-right"
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                            data-testid={`ownership-percentage-${applicant.id}`}
                          />
                          <span className="text-[color:var(--t-color-text-body)]">%</span>
                        </div>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <select
                          value={applicant.ownershipType || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'ownershipType', e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-[color:var(--t-color-text-body)] cursor-pointer"
                          data-testid={`ownership-type-${applicant.id}`}
                        >
                          <option value="">Select Type</option>
                          <option value="direct">Direct</option>
                          <option value="indirect">Indirect</option>
                        </select>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <select
                          value={applicant.projectRole || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'projectRole', e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-[color:var(--t-color-text-body)] cursor-pointer"
                          data-testid={`ownership-project-role-${applicant.id}`}
                        >
                          <option value="">Select Project Role</option>
                          <option value="owner-guarantor">Owner &amp; Guarantor</option>
                          <option value="owner-non-guarantor">Owner Non-Guarantor</option>
                          <option value="non-owner-key-manager">Non-Owner Key Manager</option>
                          <option value="other">Other</option>
                        </select>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <select
                          value={applicant.businessRole || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'businessRole', e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-[color:var(--t-color-text-body)] cursor-pointer"
                          data-testid={`ownership-business-role-${applicant.id}`}
                        >
                          <option value="">Select Role in Business Operations</option>
                          <option value="active-full-time">Active - Full Time</option>
                          <option value="active-part-time">Active - Part Time</option>
                          <option value="passive">Passive</option>
                        </select>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(applicant.id)}
                          className="text-[color:var(--t-color-text-muted)] hover:text-red-500 transition-colors"
                          data-testid={`button-delete-owner-${applicant.id}`}
                          aria-label={`Delete ${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() || 'Delete owner'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Empty rows - click to add new applicant */}
                  {Array.from({ length: Math.max(0, 5 - individualApplicants.length) }).map((_, index) => (
                    <tr
                      key={`empty-${index}`}
                      className="bg-white hover:bg-[var(--t-color-info-bg)] cursor-pointer transition-colors"
                      onClick={handleAddApplicant}
                      data-testid={`add-applicant-row-${index}`}
                    >
                      <td className="border border-[var(--t-color-border)] px-3 py-2 h-10">
                        <span className="text-[color:var(--t-color-primary-pale)] italic text-sm">Click to add applicant...</span>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2"></td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <span className="text-[color:var(--t-color-primary-pale)]">Select Type</span>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <span className="text-[color:var(--t-color-primary-pale)]">Select Project Role</span>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-3 py-2">
                        <span className="text-[color:var(--t-color-primary-pale)]">Select Role in Business Operations</span>
                      </td>
                      <td className="border border-[var(--t-color-border)] px-2 py-2"></td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-[var(--t-color-page-bg)]">
                    <td className="border border-[var(--t-color-border)] px-3 py-2"></td>
                    <td className="border border-[var(--t-color-border)] px-3 py-2 font-medium text-[color:var(--t-color-text-body)]">
                      {Number(individualApplicants.reduce((sum, a) => sum + (Number(a.ownershipPercentage) || 0), 0)).toFixed(2)}%
                    </td>
                    <td className="border border-[var(--t-color-border)] px-3 py-2" colSpan={4}></td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3">
                <label className="block text-sm font-medium text-[color:var(--t-color-text-secondary)] mb-1">Other Owners / Description of Indirect Ownership</label>
                <textarea
                  value={businessApplicant.otherOwnersDescription || ''}
                  onChange={(e) => updateBusinessApplicant({ otherOwnersDescription: e.target.value } as any)}
                  className="w-full border border-[var(--t-color-border)] rounded px-3 py-2 text-sm text-[color:var(--t-color-text-body)] bg-white focus:border-[var(--t-color-primary)] focus:ring-1 focus:ring-[var(--t-color-primary)] outline-none"
                  rows={3}
                  placeholder="If there are more owners than available rows, list additional owners here..."
                  data-testid="textarea-other-owners-pq"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (() => {
        const applicant = individualApplicants.find(a => a.id === deleteConfirmId);
        const name = applicant ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() : '';
        return (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirmId(null)}
            data-testid="modal-delete-owner"
          >
            <div
              className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[color:var(--t-color-primary)] mb-2">Delete Owner</h3>
              <p className="text-sm text-[color:var(--t-color-text-secondary)] mb-6">
                Are you sure you want to remove {name ? <strong>{name}</strong> : 'this owner'} from the application? This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm font-medium text-[color:var(--t-color-text-secondary)] bg-[var(--t-color-page-bg)] border border-[var(--t-color-border)] rounded-lg hover:bg-[var(--t-color-info-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeIndividualApplicant(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-red-600 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
