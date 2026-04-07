'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface YearSelectionModalProps {
  isOpen: boolean;
  filename: string;
  onConfirm: (selectedYears: number[]) => void;
  onCancel: () => void;
  currentFileIndex?: number;
  totalFiles?: number;
}

export default function YearSelectionModal({
  isOpen,
  filename,
  onConfirm,
  onCancel,
  currentFileIndex = 0,
  totalFiles = 1,
}: YearSelectionModalProps) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const availableYears = [2025, 2024, 2023, 2022];

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedYears);
    setSelectedYears([]);
  };

  const handleCancel = () => {
    setSelectedYears([]);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center"
      onClick={handleCancel}
      data-testid="year-modal-overlay"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[500px] w-[90%] max-h-[80vh] overflow-auto animate-[modalSlideIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        data-testid="year-modal"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b-2 border-[#e5e7eb]">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-[#1f2937]">
                  Select Tax Year(s)
                </h2>
                {totalFiles > 1 && (
                  <span className="px-2 py-0.5 bg-[#2563eb] text-white text-xs font-medium rounded-full">
                    {currentFileIndex + 1} of {totalFiles}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6b7280] italic">{filename}</p>
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
          <p className="text-[15px] text-[#4b5563] mb-5">
            Select which tax year(s) this document applies to:
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={`
                  px-6 py-4 rounded-lg border-2 text-[15px] font-medium cursor-pointer transition-all
                  ${
                    selectedYears.includes(year)
                      ? 'bg-[#2563eb] border-[#2563eb] text-white'
                      : 'bg-white border-[#d1d5db] text-[#1f2937] hover:border-[#2563eb] hover:bg-[#f0f7ff]'
                  }
                `}
                data-testid={`button-year-${year}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-6 py-3 rounded-md text-[15px] font-medium bg-[#f3f4f6] text-[#4b5563] cursor-pointer transition-all hover:bg-[#e5e7eb]"
            data-testid="button-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedYears.length === 0}
            className="px-6 py-3 rounded-md text-[15px] font-medium bg-[#2563eb] text-white cursor-pointer transition-all hover:bg-[#1d4ed8] disabled:bg-[#d1d5db] disabled:cursor-not-allowed"
            data-testid="button-confirm"
          >
            Confirm
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
