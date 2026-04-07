'use client';

import { Building2, Clock } from 'lucide-react';

interface BrokerProjectHeaderProps {
  projectName: string;
  businessName: string;
  stage: string;
  status: string;
  expiresAt?: Date;
}

const stageColors: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-700',
  BDO: 'bg-blue-100 text-blue-700',
  Underwriting: 'bg-yellow-100 text-yellow-700',
  Closing: 'bg-purple-100 text-purple-700',
  Servicing: 'bg-green-100 text-green-700',
};

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  Closed: 'bg-gray-100 text-gray-700',
};

export default function BrokerProjectHeader({
  projectName,
  businessName,
  stage,
  status,
  expiresAt,
}: BrokerProjectHeaderProps) {
  const formatExpiryDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;

    return `Expires ${date.toLocaleDateString()}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{projectName}</h1>
            <p className="text-gray-600">{businessName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors[stage] || 'bg-gray-100 text-gray-700'}`}
          >
            {stage}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}
          >
            {status}
          </span>
        </div>
      </div>

      {expiresAt && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{formatExpiryDate(new Date(expiresAt))}</span>
        </div>
      )}
    </div>
  );
}
