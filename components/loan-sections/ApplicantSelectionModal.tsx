'use client';

import { X, User } from 'lucide-react';
import { IndividualApplicant } from '@/lib/schema';

interface ApplicantSelectionModalProps {
  isOpen: boolean;
  applicants: IndividualApplicant[];
  onSelect: (applicant: IndividualApplicant) => void;
  onCancel: () => void;
}

export default function ApplicantSelectionModal({
  isOpen,
  applicants,
  onSelect,
  onCancel,
}: ApplicantSelectionModalProps) {
  if (!isOpen) return null;

  const getApplicantDisplayName = (applicant: IndividualApplicant, index: number): string => {
    const fullName = `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim();
    return fullName || `Applicant ${index + 1}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center"
      onClick={onCancel}
      data-testid="applicant-modal-overlay"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] max-h-[80vh] overflow-auto animate-[modalSlideIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        data-testid="applicant-modal"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b-2 border-[#e5e7eb]">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[#1f2937]">
                Select Individual Applicant
              </h2>
              <p className="text-sm text-[#6b7280] mt-1">
                Choose which applicant this file belongs to
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-[#6b7280] hover:text-[#1f2937] transition-colors"
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {applicants.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 mx-auto mb-3 text-[#9ca3af]" />
              <p className="text-[15px] text-[#6b7280]">
                No individual applicants have been added yet.
              </p>
              <p className="text-sm text-[#9ca3af] mt-1">
                Please add applicants in the Individual Applicants step first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {applicants.map((applicant, index) => (
                <button
                  key={applicant.id}
                  onClick={() => onSelect(applicant)}
                  className="w-full px-4 py-4 rounded-lg border-2 border-[#e5e7eb] bg-white text-left cursor-pointer transition-all hover:border-[#2563eb] hover:bg-[#f0f7ff] group"
                  data-testid={`button-select-applicant-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e5e7eb] flex items-center justify-center group-hover:bg-[#2563eb] transition-colors">
                      <User className="w-5 h-5 text-[#6b7280] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="text-[15px] font-medium text-[#1f2937]">
                        {getApplicantDisplayName(applicant, index)}
                      </p>
                      {applicant.email && (
                        <p className="text-sm text-[#6b7280]">{applicant.email}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex gap-3 justify-end border-t border-[#e5e7eb]">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-md text-[15px] font-medium bg-[#f3f4f6] text-[#4b5563] cursor-pointer transition-all hover:bg-[#e5e7eb]"
            data-testid="button-cancel"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
