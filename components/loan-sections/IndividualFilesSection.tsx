'use client';

import { useState } from 'react';
import FileUploadWithYearTags, { FileWithYear } from '@/components/loan-sections/FileUploadWithYearTags';

interface IndividualFilesSectionProps {
  projectId?: string;
  sharepointFolderId?: string;
  applicantName?: string; // Individual applicant's full name for SharePoint folder
}

export default function IndividualFilesSection({ projectId, sharepointFolderId, applicantName }: IndividualFilesSectionProps) {
  const [taxReturns, setTaxReturns] = useState<FileWithYear[]>([]);
  const [financialStatements, setFinancialStatements] = useState<FileWithYear[]>([]);
  const [resume, setResume] = useState<FileWithYear[]>([]);
  const [otherFiles, setOtherFiles] = useState<FileWithYear[]>([]);

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Individual Files</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Upload required personal documents for your loan application
        </p>
      </div>

      <div className="px-4 sm:px-6">
        <FileUploadWithYearTags
          label="Personal Federal Tax Returns (3 most recent years)"
          files={taxReturns}
          onChange={setTaxReturns}
          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
          showYearTags={true}
          testId="personal-tax-returns"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          applicantName={applicantName}
        />

        <FileUploadWithYearTags
          label="Personal Financial Statements"
          files={financialStatements}
          onChange={setFinancialStatements}
          accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
          showYearTags={false}
          testId="personal-financial-statements"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          applicantName={applicantName}
        />

        <FileUploadWithYearTags
          label="Resume"
          files={resume}
          onChange={setResume}
          accept=".pdf,.doc,.docx"
          multiple={false}
          showYearTags={false}
          testId="resume"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          applicantName={applicantName}
        />

        <FileUploadWithYearTags
          label="Other Files"
          description="Upload any additional supporting documents"
          files={otherFiles}
          onChange={setOtherFiles}
          showYearTags={false}
          showDescription={true}
          testId="individual-other-files"
          projectId={projectId}
          sharepointFolderId={sharepointFolderId}
          applicantName={applicantName}
        />
      </div>
    </div>
  );
}
