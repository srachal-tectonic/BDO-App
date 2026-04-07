'use client';

import { useState } from 'react';
import FileUploadWithYearTags, { FileWithYear } from '@/components/loan-sections/FileUploadWithYearTags';

interface BusinessFilesSectionProps {
  projectId?: string;
  sharepointFolderId?: string;
}

export default function BusinessFilesSection({ projectId, sharepointFolderId }: BusinessFilesSectionProps) {
  const [taxReturns, setTaxReturns] = useState<FileWithYear[]>([]);
  const [incomeStatements, setIncomeStatements] = useState<FileWithYear[]>([]);
  const [balanceSheets, setBalanceSheets] = useState<FileWithYear[]>([]);
  const [otherFiles, setOtherFiles] = useState<FileWithYear[]>([]);

  console.log('[BusinessFilesSection] Props received:', { projectId, sharepointFolderId });

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Business Files</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Upload required business documents for your loan application
        </p>
      </div>

      <div className="px-4 sm:px-6">
        <FileUploadWithYearTags
          label="Business Federal Tax Returns (3 most recent years)"
          files={taxReturns}
          onChange={setTaxReturns}
          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
          showYearTags={true}
          testId="business-tax-returns"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          subfolder="Business Files"
        />

        <FileUploadWithYearTags
          label="Interim Income Statement"
          files={incomeStatements}
          onChange={setIncomeStatements}
          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
          multiple={false}
          showYearTags={true}
          testId="interim-income-statement"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          subfolder="Business Files"
        />

        <FileUploadWithYearTags
          label="Interim Balance Sheet"
          files={balanceSheets}
          onChange={setBalanceSheets}
          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
          multiple={false}
          showYearTags={true}
          testId="interim-balance-sheet"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          subfolder="Business Files"
        />

        <FileUploadWithYearTags
          label="Other Files"
          description="Upload any additional supporting documents"
          files={otherFiles}
          onChange={setOtherFiles}
          showYearTags={false}
          showDescription={true}
          testId="business-other-files"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          subfolder="Business Files"
        />
      </div>
    </div>
  );
}
