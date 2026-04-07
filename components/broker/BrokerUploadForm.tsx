'use client';

import { useState } from 'react';
import { Building2, User } from 'lucide-react';
import BrokerFileUpload from './BrokerFileUpload';

interface BrokerUploadFormProps {
  token: string;
}

type TabType = 'business' | 'individual';

export default function BrokerUploadForm({ token }: BrokerUploadFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('business');

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('business')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'business'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Business Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'individual'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" />
          Individual Files
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'business' && (
          <>
            <BrokerFileUpload
              token={token}
              subfolder="Business Files"
              category="Business Tax Returns"
              label="Business Federal Tax Returns"
              description="Upload the 3 most recent years"
              showYearTags={true}
            />
            <BrokerFileUpload
              token={token}
              subfolder="Business Files"
              category="Interim Income Statement"
              label="Interim Income Statement"
              description="Current year-to-date"
              showYearTags={true}
            />
            <BrokerFileUpload
              token={token}
              subfolder="Business Files"
              category="Interim Balance Sheet"
              label="Interim Balance Sheet"
              description="Current year-to-date"
              showYearTags={true}
            />
            <BrokerFileUpload
              token={token}
              subfolder="Business Files"
              category="Other Business Files"
              label="Other Business Documents"
              description="Any additional business documents"
            />
          </>
        )}

        {activeTab === 'individual' && (
          <>
            <BrokerFileUpload
              token={token}
              subfolder="Individual Files"
              category="Personal Tax Returns"
              label="Personal Federal Tax Returns"
              description="Upload the 3 most recent years for each guarantor"
              showYearTags={true}
            />
            <BrokerFileUpload
              token={token}
              subfolder="Individual Files"
              category="Personal Financial Statements"
              label="Personal Financial Statements"
              description="Current PFS for each guarantor"
            />
            <BrokerFileUpload
              token={token}
              subfolder="Individual Files"
              category="Resumes"
              label="Resumes"
              description="Resume for each key principal"
            />
            <BrokerFileUpload
              token={token}
              subfolder="Individual Files"
              category="Other Individual Files"
              label="Other Personal Documents"
              description="Any additional individual documents"
            />
          </>
        )}
      </div>
    </div>
  );
}
