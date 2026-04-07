'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2, ShieldX, Clock, FileX } from 'lucide-react';
import BrokerProjectHeader from '@/components/broker/BrokerProjectHeader';
import BrokerUploadForm from '@/components/broker/BrokerUploadForm';

interface ProjectInfo {
  id: string;
  projectName: string;
  businessName: string;
  stage: string;
  status: string;
}

interface TokenInfo {
  expiresAt: string;
  uploadCount: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  project?: ProjectInfo;
  tokenInfo?: TokenInfo;
}

export default function BrokerLandingPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationResult({ valid: false, error: 'not_found', message: 'No token provided' });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/broker/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        setValidationResult(data);
      } catch (error) {
        setValidationResult({
          valid: false,
          error: 'invalid_request',
          message: 'Failed to validate access. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Validating your access...</p>
      </div>
    );
  }

  // Error states
  if (!validationResult?.valid) {
    const errorConfig = {
      not_found: {
        icon: FileX,
        title: 'Invalid Link',
        description: 'This link is invalid or has been removed.',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      },
      expired: {
        icon: Clock,
        title: 'Link Expired',
        description: 'This link has expired.',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
      },
      revoked: {
        icon: ShieldX,
        title: 'Access Revoked',
        description: 'Access to this link has been revoked.',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
      },
      invalid_request: {
        icon: AlertCircle,
        title: 'Error',
        description: validationResult?.message || 'An error occurred.',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
      },
    };

    const config = errorConfig[validationResult?.error as keyof typeof errorConfig] || errorConfig.invalid_request;
    const IconComponent = config.icon;

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mb-4`}>
          <IconComponent className={`w-8 h-8 ${config.color}`} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h2>
        <p className="text-gray-600 mb-6 max-w-md">{config.description}</p>
        <p className="text-sm text-gray-500">
          Please contact your BDO representative for a new link.
        </p>
      </div>
    );
  }

  // Valid token - show upload form
  const { project, tokenInfo } = validationResult;

  return (
    <div>
      {/* Project Header */}
      {project && (
        <BrokerProjectHeader
          projectName={project.projectName}
          businessName={project.businessName}
          stage={project.stage}
          status={project.status}
          expiresAt={tokenInfo?.expiresAt ? new Date(tokenInfo.expiresAt) : undefined}
        />
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-blue-900 mb-2">
          Upload Instructions
        </h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select the appropriate tab (Business or Individual)</li>
          <li>• Upload files to the correct category</li>
          <li>• For tax returns, select the applicable year(s)</li>
          <li>• Maximum file size: 10MB per file</li>
          <li>• Accepted formats: PDF, Excel, Word, and images</li>
        </ul>
      </div>

      {/* Upload Form */}
      <BrokerUploadForm token={token} />

      {/* Upload Count */}
      {tokenInfo && tokenInfo.uploadCount > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Total files uploaded with this link: {tokenInfo.uploadCount}
        </div>
      )}
    </div>
  );
}
