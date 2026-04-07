'use client';

import { ChevronRight, FileText } from 'lucide-react';

interface Simple7aLOIProps {
  onBack: () => void;
}

export default function Simple7aLOI({ onBack }: Simple7aLOIProps) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] min-h-[calc(100vh-160px)]">
      <div className="border-b border-[#e5e7eb] p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover-elevate active-elevate-2"
            data-testid="button-back-from-7a"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-[20px] font-semibold text-[#1a1a1a]">7(a) Letter of Interest</h2>
            <p className="text-[#6b7280] text-[14px] mt-1">SBA 7(a) loan proposal letter</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <div className="w-16 h-16 rounded-full bg-[#2563eb]/10 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#2563eb]" />
        </div>
        <h3 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">Coming Soon</h3>
        <p className="text-[#6b7280] text-[14px] text-center max-w-md">
          The 7(a) LOI generator is currently under development. Check back soon for updates.
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-4 py-2 border border-[#d1d5db] text-[#374151] text-[14px] font-medium rounded-lg hover-elevate active-elevate-2"
          data-testid="button-back-from-7a-bottom"
        >
          Back to Proposal Letters
        </button>
      </div>
    </div>
  );
}
