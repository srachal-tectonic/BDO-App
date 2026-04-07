'use client';

import { useState } from 'react';
import { X, User, ChevronLeft, FileText, ClipboardList, Briefcase, FolderOpen } from 'lucide-react';
import { IndividualApplicant } from '@/lib/schema';

export type IndividualFileType =
  | 'personal-tax-returns'
  | 'personal-financial-statements'
  | 'resume'
  | 'other-individual-files';

export interface IndividualFileTypeOption {
  id: IndividualFileType;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresYearTag: boolean;
}

export const INDIVIDUAL_FILE_TYPES: IndividualFileTypeOption[] = [
  {
    id: 'personal-tax-returns',
    label: 'Personal Federal Tax Returns',
    description: '3 most recent years',
    icon: <FileText className="w-5 h-5" />,
    requiresYearTag: true,
  },
  {
    id: 'personal-financial-statements',
    label: 'Personal Financial Statements',
    description: 'Current financial position',
    icon: <ClipboardList className="w-5 h-5" />,
    requiresYearTag: false,
  },
  {
    id: 'resume',
    label: 'Resume',
    description: 'Professional background',
    icon: <Briefcase className="w-5 h-5" />,
    requiresYearTag: false,
  },
  {
    id: 'other-individual-files',
    label: 'Other Individual Files',
    description: 'Additional personal documents',
    icon: <FolderOpen className="w-5 h-5" />,
    requiresYearTag: false,
  },
];

interface IndividualFileUploadModalProps {
  isOpen: boolean;
  filename: string;
  applicants: IndividualApplicant[];
  onSelect: (applicant: IndividualApplicant, fileType: IndividualFileTypeOption) => void;
  onCancel: () => void;
}

type ModalStep = 'applicant' | 'file-type';

export default function IndividualFileUploadModal({
  isOpen,
  filename,
  applicants,
  onSelect,
  onCancel,
}: IndividualFileUploadModalProps) {
  const [step, setStep] = useState<ModalStep>('applicant');
  const [selectedApplicant, setSelectedApplicant] = useState<IndividualApplicant | null>(null);

  const handleCancel = () => {
    setStep('applicant');
    setSelectedApplicant(null);
    onCancel();
  };

  const handleApplicantSelect = (applicant: IndividualApplicant) => {
    setSelectedApplicant(applicant);
    setStep('file-type');
  };

  const handleBack = () => {
    setStep('applicant');
  };

  const handleFileTypeSelect = (fileType: IndividualFileTypeOption) => {
    if (selectedApplicant) {
      onSelect(selectedApplicant, fileType);
      // Reset state for next use
      setStep('applicant');
      setSelectedApplicant(null);
    }
  };

  const getApplicantDisplayName = (applicant: IndividualApplicant, index: number): string => {
    const fullName = `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim();
    return fullName || `Applicant ${index + 1}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center"
      onClick={handleCancel}
      data-testid="individual-file-modal-overlay"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] max-h-[80vh] overflow-auto animate-[modalSlideIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        data-testid="individual-file-modal"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b-2 border-[#e5e7eb]">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {step === 'file-type' && (
                  <button
                    onClick={handleBack}
                    className="text-[#6b7280] hover:text-[#1f2937] transition-colors mr-1"
                    data-testid="button-back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-xl font-semibold text-[#1f2937]">
                  {step === 'applicant' ? 'Select Individual Applicant' : 'Select File Type'}
                </h2>
              </div>
              <p className="text-sm text-[#6b7280] italic">{filename}</p>
              {step === 'file-type' && selectedApplicant && (
                <p className="text-sm text-[#2563eb] mt-1 font-medium">
                  For: {getApplicantDisplayName(selectedApplicant, applicants.findIndex(a => a.id === selectedApplicant.id))}
                </p>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="text-[#6b7280] hover:text-[#1f2937] transition-colors"
              data-testid="button-close-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'applicant' ? (
            <>
              <p className="text-[15px] text-[#4b5563] mb-4">
                Which applicant does this file belong to?
              </p>

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
                      onClick={() => handleApplicantSelect(applicant)}
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
            </>
          ) : (
            <>
              <p className="text-[15px] text-[#4b5563] mb-4">
                What type of document is this?
              </p>

              <div className="space-y-2">
                {INDIVIDUAL_FILE_TYPES.map((fileType) => (
                  <button
                    key={fileType.id}
                    onClick={() => handleFileTypeSelect(fileType)}
                    className="w-full px-4 py-4 rounded-lg border-2 border-[#e5e7eb] bg-white text-left cursor-pointer transition-all hover:border-[#2563eb] hover:bg-[#f0f7ff] group"
                    data-testid={`button-file-type-${fileType.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e5e7eb] flex items-center justify-center group-hover:bg-[#2563eb] transition-colors">
                        <span className="text-[#6b7280] group-hover:text-white transition-colors">
                          {fileType.icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-[#1f2937]">
                          {fileType.label}
                        </p>
                        <p className="text-sm text-[#6b7280]">{fileType.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex gap-3 justify-end border-t border-[#e5e7eb]">
          {step === 'file-type' && (
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-md text-[15px] font-medium bg-[#f3f4f6] text-[#4b5563] cursor-pointer transition-all hover:bg-[#e5e7eb]"
              data-testid="button-back-footer"
            >
              Back
            </button>
          )}
          <button
            onClick={handleCancel}
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
