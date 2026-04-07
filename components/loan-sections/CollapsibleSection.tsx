'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleSection({
  title,
  children,
  defaultExpanded = true
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg mb-6 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center p-5 cursor-pointer border-b border-[#e5e7eb]"
        data-testid={`section-header-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <h2 className="text-lg font-semibold text-[#1f2937] flex items-center gap-3 m-0">
          <ChevronDown
            className={`w-4 h-4 text-[#9ca3af] transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
          {title}
        </h2>
      </div>

      {isExpanded && (
        <div className="p-6" data-testid={`section-content-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {children}
        </div>
      )}
    </div>
  );
}
