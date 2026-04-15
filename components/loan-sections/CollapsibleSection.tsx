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
    <div className="bg-white border border-[var(--t-color-border)] rounded-lg mb-6 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center p-5 cursor-pointer border-b border-[var(--t-color-border)]"
        data-testid={`section-header-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <h2
          className="font-semibold uppercase tracking-wider flex items-center gap-2 m-0 text-[length:var(--t-font-size-section-header)] text-[color:var(--t-color-text-primary)]"
          style={{ fontFamily: 'var(--t-font-family)' }}
        >
          <ChevronDown
            className={`w-4 h-4 text-[color:var(--t-color-text-muted)] transition-transform ${
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
