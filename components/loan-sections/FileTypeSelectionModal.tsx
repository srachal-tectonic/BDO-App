'use client';

import { X, FileText, Calculator, ClipboardList, FolderOpen } from 'lucide-react';

export type BusinessFileType =
  | 'business-tax-returns'
  | 'interim-income-statement'
  | 'interim-balance-sheet'
  | 'other-business-files';

export interface FileTypeOption {
  id: BusinessFileType;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresYearTag: boolean;
}

export const BUSINESS_FILE_TYPES: FileTypeOption[] = [
  {
    id: 'business-tax-returns',
    label: 'Business Federal Tax Returns',
    description: '3 most recent years',
    icon: <FileText className="w-5 h-5" />,
    requiresYearTag: true,
  },
  {
    id: 'interim-income-statement',
    label: 'Interim Income Statement',
    description: 'Current period financial statement',
    icon: <Calculator className="w-5 h-5" />,
    requiresYearTag: false,
  },
  {
    id: 'interim-balance-sheet',
    label: 'Interim Balance Sheet',
    description: 'Current period balance sheet',
    icon: <ClipboardList className="w-5 h-5" />,
    requiresYearTag: false,
  },
  {
    id: 'other-business-files',
    label: 'Other Business Files',
    description: 'Additional supporting documents',
    icon: <FolderOpen className="w-5 h-5" />,
    requiresYearTag: false,
  },
];

interface FileTypeSelectionModalProps {
  isOpen: boolean;
  filename: string;
  onSelect: (fileType: FileTypeOption) => void;
  onCancel: () => void;
}

export default function FileTypeSelectionModal({
  isOpen,
  filename,
  onSelect,
  onCancel,
}: FileTypeSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center"
      onClick={onCancel}
      data-testid="file-type-modal-overlay"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] max-h-[80vh] overflow-auto animate-[modalSlideIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        data-testid="file-type-modal"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b-2 border-[#e5e7eb]">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[#1f2937]">
                Select File Type
              </h2>
              <p className="text-sm text-[#6b7280] mt-1 italic">{filename}</p>
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
          <p className="text-[15px] text-[#4b5563] mb-4">
            What type of document is this?
          </p>

          <div className="space-y-2">
            {BUSINESS_FILE_TYPES.map((fileType) => (
              <button
                key={fileType.id}
                onClick={() => onSelect(fileType)}
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
