'use client';

import { useApplication } from '@/lib/applicationStore';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function BusinessQuestionnaireSection() {
  const { data: applicationData } = useApplication();

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[color:var(--t-color-text-body)]">Business Questionnaire</h1>
        <p className="text-sm text-[color:var(--t-color-text-secondary)] mt-1">
          Complete the custom questionnaire for your loan application
        </p>
      </div>

      <div className="px-4 sm:px-6">
        <div className="bg-[#f8f9fb] rounded-lg border border-[var(--t-color-border)] p-8">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-semibold text-[color:var(--t-color-text-body)] mb-3">Dynamic Questionnaire</h3>
            <p className="text-[color:var(--t-color-text-secondary)] mb-6">
              Based on your project's purpose, industry, and funding structure, we've generated a custom questionnaire to gather additional information needed for your SBA loan application.
            </p>
            <Link href={`/bdo/borrower-portal/${applicationData.projectId}/questionnaire`}>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--t-color-accent)] text-white font-medium rounded-lg hover:bg-[var(--t-color-primary)] transition-colors">
                Open Business Questionnaire
                <ExternalLink className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
