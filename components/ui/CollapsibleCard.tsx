'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export function CollapsibleCard({
  title,
  defaultExpanded = true,
  expanded,
  onToggle,
  children,
  headerContent,
}: CollapsibleCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Sync internal state when controlled `expanded` prop changes
  useEffect(() => {
    if (expanded !== undefined) {
      setInternalExpanded(expanded);
    }
  }, [expanded]);

  const isExpanded = expanded !== undefined ? expanded : internalExpanded;

  const handleToggle = () => {
    const next = !isExpanded;
    setInternalExpanded(next);
    onToggle?.(next);
  };

  return (
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
      <div
        className="flex items-center justify-between px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb] cursor-pointer hover:bg-[#f3f4f6] transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-[#6b7280]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#6b7280]" />
          )}
          <h3 className="text-sm font-semibold text-[#374151]">{title}</h3>
        </div>
        {headerContent && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerContent}
          </div>
        )}
      </div>
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
