'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/lib/applicationStore';
import FinancingSourcesSection from '@/components/loan-sections/FinancingSourcesSection';
import SourcesUsesMatrix from '@/components/loan-sections/SourcesUsesMatrix';

interface FinancialAnalysisPanelProps {
  projectId: string;
  spreadId: string;
}

export default function FinancialAnalysisPanel({ projectId, spreadId }: FinancialAnalysisPanelProps) {
  const { data, updateSourcesUses } = useApplication();
  const { sourcesUses } = data;

  return (
    <div className="space-y-6">
      {/* Generate Analysis Button */}
      <div className="flex justify-end">
        <Button
          className="bg-[#2563eb] text-white gap-2"
          onClick={() => {/* no-op for now */}}
          data-testid="button-generate-analysis"
        >
          <Sparkles className="w-4 h-4" />
          Generate Analysis
        </Button>
      </div>

      {/* Financing Sources — read-only mirror of the Spreads tab table */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#2563eb] mb-2 pb-1 border-b-2 border-[#2563eb]">
          Financing Sources
        </h3>
        <FinancingSourcesSection isReadOnly />
      </div>

      {/* Sources and Uses — read-only mirror of the Spreads tab table */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#2563eb] mb-2 pb-1 border-b-2 border-[#2563eb]">
          Sources and Uses
        </h3>
        <SourcesUsesMatrix
          isReadOnly
          sourcesUses={sourcesUses as any}
          updateSourcesUses={updateSourcesUses}
        />
      </div>
    </div>
  );
}
