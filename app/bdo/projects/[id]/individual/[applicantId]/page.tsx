'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApplication } from '@/lib/applicationStore';
import { BDOLayout } from '@/components/layout/BDOLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LearnMorePanel from '@/components/LearnMorePanel';
import AddressInput from '@/components/loan-sections/AddressInput';
import PasswordToggle from '@/components/loan-sections/PasswordToggle';
import { CurrencyInput } from '@/components/ui/currency-input';
import { getLoanApplication, saveLoanApplication } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, HelpCircle, Mail, Copy, Check } from 'lucide-react';
import type { IndividualApplicant } from '@/lib/schema';

export default function OwnerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const applicantId = params?.applicantId as string;

  const { data, updateIndividualApplicant, loadFromFirestore } = useApplication();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [learnMoreContent, setLearnMoreContent] = useState({ title: '', content: '' });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const hasLoadedRef = useRef(false);

  // Load data on mount - only once
  useEffect(() => {
    if (hasLoadedRef.current || !projectId) return;
    hasLoadedRef.current = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const applicationData = await getLoanApplication(projectId);
        if (applicationData) {
          loadFromFirestore(applicationData);
        }
      } catch (error) {
        console.error('Error loading application data:', error);
      } finally {
        setIsLoading(false);
        // Delay setting this to allow state to settle
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 100);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-save when data changes (debounced)
  // Use a stringified version of just the applicant data to avoid unnecessary triggers
  const applicantDataString = JSON.stringify(data.individualApplicants?.find(a => a.id === applicantId) || {});

  useEffect(() => {
    // Don't auto-save during initial load or while loading
    if (isInitialLoadRef.current || isLoading || !hasLoadedRef.current) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveLoanApplication(projectId, data);
        console.log('Auto-saved applicant data');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantDataString, projectId]);

  const applicant = data.individualApplicants?.find(a => a.id === applicantId);

  const handleLearnMore = (title: string, content: string) => {
    setLearnMoreContent({ title, content });
    setIsLearnMoreOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveLoanApplication(projectId, data);
      toast({
        title: 'Draft saved',
        description: 'Your changes have been saved',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToOwners = () => {
    router.push(`/bdo/projects/${projectId}`);
  };

  const updateApplicant = (field: keyof IndividualApplicant, value: any) => {
    updateIndividualApplicant(applicantId, { [field]: value } as any);
  };

  const getBorrowerPortalLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/project/${projectId}/individual/${applicantId}`;
  };

  const handleSendLink = () => {
    const link = getBorrowerPortalLink();
    const applicantName = applicant?.firstName || 'Borrower';
    const projectName = data.projectOverview?.projectName || 'your loan application';

    const subject = encodeURIComponent(`Complete Your Loan Application - ${projectName}`);
    const body = encodeURIComponent(
      `Dear ${applicantName},\n\n` +
      `Please use the link below to complete your portion of the loan application:\n\n` +
      `${link}\n\n` +
      `If you have any questions, please don't hesitate to reach out.\n\n` +
      `Best regards`
    );

    const mailtoUrl = applicant?.email
      ? `mailto:${applicant.email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;

    window.open(mailtoUrl, '_blank');
  };

  const handleCopyLink = async () => {
    const link = getBorrowerPortalLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast({
        title: 'Link copied',
        description: 'Borrower portal link copied to clipboard',
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <BDOLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading applicant...</p>
          </div>
        </div>
      </BDOLayout>
    );
  }

  if (!applicant) {
    return (
      <BDOLayout title="Owner Not Found">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Owner Not Found</h2>
            <p className="text-muted-foreground mb-6">The owner you&apos;re looking for doesn&apos;t exist in this project.</p>
            <Button onClick={handleBackToOwners}>
              Back to Individual Applicants
            </Button>
          </CardContent>
        </Card>
      </BDOLayout>
    );
  }

  const applicantName = applicant.firstName && applicant.lastName
    ? `${applicant.firstName} ${applicant.lastName}`
    : applicant.firstName || 'New Owner';

  const isNonOwner = applicant.projectRole === 'non-owner-key-manager' || applicant.projectRole === 'other';
  const isPassive = applicant.businessRole === 'passive';

  return (
    <BDOLayout title={applicantName}>
      <LearnMorePanel
        isOpen={isLearnMoreOpen}
        onClose={() => setIsLearnMoreOpen(false)}
        title={learnMoreContent.title}
      >
        <div className="whitespace-pre-wrap">{learnMoreContent.content}</div>
      </LearnMorePanel>

      <Card className="bg-white">
        <CardContent className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <button
                onClick={handleBackToOwners}
                className="inline-flex items-center gap-2 text-[#2563eb] hover:text-[#1d4ed8] font-medium transition-colors"
                data-testid="button-back-to-owners"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Individual Applicants
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <nav className="text-sm text-[#6b7280] mb-1">
                  Individual Applicants <span className="mx-1">&rsaquo;</span> <span className="text-[#1a1a1a] font-medium">{applicantName}</span>
                </nav>
                <h1 className="text-[28px] font-bold text-[#1a1a1a]">{applicantName}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSendLink}
                  className="flex items-center gap-2"
                  data-testid="button-send-link"
                >
                  <Mail className="w-4 h-4" />
                  Send Link
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                  data-testid="button-copy-link"
                >
                  {copiedLink ? (
                    <Check className="w-4 h-4 text-[#10b981]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  Copy Link
                </Button>
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="mb-6">
            <h4 className="text-base font-semibold text-[#1f2937] mb-4 pb-2 border-b-2 border-[#2563eb]">
              Personal Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">First Name</label>
                <input
                  type="text"
                  value={applicant.firstName || ''}
                  onChange={(e) => updateApplicant('firstName', e.target.value)}
                  placeholder="First Name"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                  data-testid="input-firstname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Last Name</label>
                <input
                  type="text"
                  value={applicant.lastName || ''}
                  onChange={(e) => updateApplicant('lastName', e.target.value)}
                  placeholder="Last Name"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                  data-testid="input-lastname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Social Security Number</label>
                <PasswordToggle
                  id="ssn"
                  value={applicant.ssn || ''}
                  onChange={(value) => updateApplicant('ssn', value)}
                  placeholder="XXX-XX-XXXX"
                  testId="input-ssn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Estimated Credit Score
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Estimated Credit Score',
                      'What information is being requested:\n\nYour best estimate of your current personal credit score range. This is a self-reported number; we will still obtain an official credit report later.\n\nWhy we need it:\n\nYour estimate helps us quickly determine whether the opportunity is likely to meet minimum credit standards before we pull a full report. This can save you time and avoid unnecessary credit inquiries if the fit is clearly not there.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-credit-score"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <Select
                  value={applicant.estimatedCreditScore || ''}
                  onValueChange={(value) => updateApplicant('estimatedCreditScore', value)}
                >
                  <SelectTrigger
                    className="w-full px-4 py-3 h-auto border border-[#d1d5db] rounded-lg text-[15px]"
                    data-testid="select-credit-score"
                  >
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="750+">750+</SelectItem>
                    <SelectItem value="700-749">700-749</SelectItem>
                    <SelectItem value="650-699">650-699</SelectItem>
                    <SelectItem value="600-649">600-649</SelectItem>
                    <SelectItem value="Below 600">Below 600</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(applicant.estimatedCreditScore === '600-649' || applicant.estimatedCreditScore === 'Below 600') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Explanation of Credit Score
                </label>
                <textarea
                  value={applicant.creditScoreExplanation || ''}
                  onChange={(e) => updateApplicant('creditScoreExplanation', e.target.value)}
                  placeholder="Please provide an explanation for your credit score..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none resize-none"
                  data-testid="textarea-credit-explanation"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Mobile Phone Number</label>
                <input
                  type="tel"
                  value={applicant.phone || ''}
                  onChange={(e) => updateApplicant('phone', e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2">Email Address</label>
                <input
                  type="email"
                  value={applicant.email || ''}
                  onChange={(e) => updateApplicant('email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                  data-testid="input-email"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#374151] mb-2">Home Address</label>
                <AddressInput
                  value={applicant.homeAddress || applicant.address}
                  onChange={(addr) => updateApplicant('homeAddress', addr)}
                  idPrefix="owner-home"
                />
              </div>
            </div>
          </div>

          {/* Project & Business Involvement Section */}
          <div className="mb-6">
            <h4 className="text-base font-semibold text-[#1f2937] mb-4 pb-2 border-b-2 border-[#2563eb]">
              Project &amp; Business Involvement
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Project Role
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Project Role',
                      'What information is being requested:\n\nHow you will be involved in this specific loan/project—for example, as an owner, guarantor, co-borrower, or key principal.\n\nWhy we need it:\n\nYour project role tells us whether you will be responsible for repaying the loan personally (as a guarantor) and what obligations you\'ll have under the loan documents. The SBA requires us to clearly document each principal\'s role in the transaction.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-project-role"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <select
                  value={applicant.projectRole || ''}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    updateApplicant('projectRole', newRole);
                    if (newRole === 'non-owner-key-manager' || newRole === 'other') {
                      updateApplicant('ownershipPercentage', 0);
                      updateApplicant('ownershipType', '');
                    }
                  }}
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                  data-testid="select-project-role"
                >
                  <option value="">Select Project Role</option>
                  <option value="owner-guarantor">Owner &amp; Guarantor</option>
                  <option value="owner-non-guarantor">Owner Non-Guarantor</option>
                  <option value="non-owner-key-manager">Non-Owner Key Manager</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Ownership %
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Ownership %',
                      'What information is being requested:\n\nThe percentage of ownership interest you personally hold in the business (for example: 50%).\n\nWhy we need it:\n\nAnyone who owns 20% or more of the business is typically required by SBA rules to provide personal financial information and a personal guarantee. Your ownership percentage determines what disclosures and guarantees are required.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-ownership"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <input
                  type="number"
                  value={applicant.ownershipPercentage ?? ''}
                  onChange={(e) => updateApplicant('ownershipPercentage', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={isNonOwner}
                  className={`w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:outline-none ${
                    isNonOwner
                      ? 'bg-[#f9fafb] text-[#6b7280] cursor-not-allowed'
                      : 'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                  }`}
                  data-testid="input-ownership"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Ownership Type
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Is the ownership direct or through an entity?',
                      'What information is being requested:\n\nWhether you own your share of the business in your own name (Direct Ownership) or through another company, trust, or holding entity (Through an Entity).\n\nWhy we need it:\n\nSBA and banking regulations require us to identify the "true" individual owners behind any entities. If ownership is through an entity, we may need additional information on that company and its owners to meet Know Your Customer (KYC) and SBA requirements.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-ownership-type"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <select
                  value={applicant.ownershipType || ''}
                  onChange={(e) => updateApplicant('ownershipType', e.target.value)}
                  disabled={isNonOwner}
                  className={`w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:outline-none ${
                    isNonOwner
                      ? 'bg-[#f9fafb] text-[#6b7280] cursor-not-allowed'
                      : 'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                  }`}
                  data-testid="select-ownership-type"
                >
                  <option value="">Select Ownership Type</option>
                  <option value="direct">Direct Ownership</option>
                  <option value="indirect">Through an Entity</option>
                </select>
              </div>
            </div>

            {applicant.ownershipType === 'indirect' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#374151] mb-2">
                  Indirect Ownership Description
                </label>
                <textarea
                  value={applicant.indirectOwnershipDescription || ''}
                  onChange={(e) => updateApplicant('indirectOwnershipDescription', e.target.value)}
                  placeholder="Describe the entity and ownership structure (e.g., 'Owns 100% of ABC Holdings LLC, which owns 50% of the applicant business')"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[80px]"
                  data-testid="textarea-indirect-ownership"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Role in Business Operations
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Role in Business Operations',
                      'What information is being requested:\n\nWhether you actively work in the business and at what level (full-time, part-time, or passive/investor only).\n\nWhy we need it:\n\nLenders and the SBA look at the strength and commitment of the management team. Knowing if you are actively running the business full time or are a passive owner helps us assess management risk and long-term stability.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-business-role"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <select
                  value={applicant.businessRole || ''}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    updateApplicant('businessRole', newRole);
                    if (newRole === 'passive') {
                      updateApplicant('experience', '');
                      updateApplicant('yearsOfExperience', '');
                    }
                  }}
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none"
                  data-testid="select-business-role"
                >
                  <option value="">Select Role</option>
                  <option value="active-full-time">Active - Full Time</option>
                  <option value="active-part-time">Active - Part Time</option>
                  <option value="passive">Passive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Travel Time to Business
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Travel Time to Business',
                      'What information is being requested:\n\nHow long it takes you to commute from your home to the business location.\n\nWhy we need it:\n\nTravel time can indicate your level of commitment and ability to actively manage the business. Shorter commute times generally suggest easier day-to-day involvement and oversight of operations.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-travel-time"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <select
                  value={applicant.travelTime || ''}
                  onChange={(e) => updateApplicant('travelTime', e.target.value)}
                  disabled={isPassive}
                  className={`w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:outline-none ${
                    isPassive
                      ? 'bg-[#f9fafb] text-[#6b7280] cursor-not-allowed'
                      : 'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                  }`}
                  data-testid="select-travel-time"
                >
                  <option value="">Select Travel Time</option>
                  <option value="less than 30 minutes">less than 30 minutes</option>
                  <option value="30 to 60 minutes">30 to 60 minutes</option>
                  <option value="60 to 120 minutes">60 to 120 minutes</option>
                  <option value="more than 120 minutes">more than 120 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Relevant Experience
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Relevant Experience in Subject Business',
                      'What information is being requested:\n\nThe type of experience you have in this specific industry or business type—for example, direct hands-on experience, related experience, or no prior experience.\n\nWhy we need it:\n\nSBA lenders place a lot of weight on management\'s experience in the same or a closely related line of business. More relevant experience generally lowers risk and can strengthen your loan request.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-experience"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <select
                  value={applicant.experience || ''}
                  onChange={(e) => updateApplicant('experience', e.target.value)}
                  disabled={isPassive}
                  className={`w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:outline-none ${
                    isPassive
                      ? 'bg-[#f9fafb] text-[#6b7280] cursor-not-allowed'
                      : 'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                  }`}
                  data-testid="select-experience"
                >
                  <option value="">Select Experience Type</option>
                  <option value="Direct">Direct</option>
                  <option value="Transferrable">Transferrable</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Years of Experience
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Relevant Years of Experience',
                      'What information is being requested:\n\nThe number of years you have worked in this industry or in a similar business.\n\nWhy we need it:\n\nYears of experience help us gauge your familiarity with industry cycles, competition, staffing, and operations. A longer track record can offset other risks and supports the business\'s ability to succeed and repay the loan.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-years-experience"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <select
                  value={applicant.yearsOfExperience || ''}
                  onChange={(e) => updateApplicant('yearsOfExperience', e.target.value)}
                  disabled={isPassive}
                  className={`w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:outline-none ${
                    isPassive
                      ? 'bg-[#f9fafb] text-[#6b7280] cursor-not-allowed'
                      : 'focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]'
                  }`}
                  data-testid="select-years-experience"
                >
                  <option value="">Select Years</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                  <option value="11">More than 10</option>
                </select>
              </div>
            </div>

            {(applicant.businessRole === 'active-full-time' || applicant.businessRole === 'active-part-time') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Describe your role in the business and how your experience qualifies you for it.
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Business Operations Involvement',
                      'What information is being requested:\n\nA brief description of your day-to-day responsibilities in the business—for example: managing staff, overseeing finances, handling sales, or running operations—and how your prior work experience prepares you for this role.\n\nWhy we need it:\n\nUnderstanding what you actually do in the business helps us evaluate management experience, depth of leadership, and whether the team has the skills needed to repay the loan and execute the business plan.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-business-role-description"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <textarea
                  value={applicant.businessRoleDescription || ''}
                  onChange={(e) => updateApplicant('businessRoleDescription', e.target.value)}
                  placeholder="Please describe your specific responsibilities and role in the business"
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[100px]"
                  data-testid="textarea-business-role-description"
                />
              </div>
            )}

            {applicant.travelTime === 'more than 120 minutes' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Plan to be On-Site
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Plan to be On-Site',
                      'What information is being requested:\n\nSince your travel time to the business is more than 120 minutes, we need to understand how you plan to manage this distance. Please explain how often you plan to be on-site, how you will get there, whether you\'ll be relocating closer to the business, or any other arrangements you have made to ensure effective management despite the distance.\n\nWhy we need it:\n\nA long commute can raise concerns about your ability to actively oversee day-to-day operations. Your plan demonstrates how you will remain engaged and committed to the business despite the distance.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-plan-onsite"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <textarea
                  value={applicant.planToBeOnSite || ''}
                  onChange={(e) => updateApplicant('planToBeOnSite', e.target.value)}
                  placeholder="Please explain how often you plan to be on-site, how you will get there, if you'll be relocating closer to the business, or any other arrangements to ensure effective management despite the distance."
                  className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none min-h-[100px]"
                  data-testid="textarea-plan-onsite"
                />
              </div>
            )}
          </div>

          {/* Personal Financials Section */}
          <div className="mb-6">
            <h4 className="text-base font-semibold text-[#1f2937] mb-4 pb-2 border-b-2 border-[#2563eb]">
              Personal Financials
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Net Worth
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Net Worth',
                      'What information is being requested:\n\nYour approximate total personal net worth: all assets you own (cash, investments, real estate, retirement accounts, etc.) minus all personal debts (mortgage, credit cards, loans).\n\nWhy we need it:\n\nNet worth gives us a snapshot of your overall financial strength and capacity to support the business if needed. SBA lenders use this to assess guarantor support and to confirm you meet certain program requirements.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-net-worth"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <CurrencyInput
                  value={applicant.netWorth || ''}
                  onChange={(value) => updateApplicant('netWorth', value)}
                  placeholder="0"
                  showDecimals={false}
                  data-testid="input-net-worth"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Post-Close Liquidity
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Post-Close Liquidity',
                      'What information is being requested:\n\nThe amount of liquid personal funds you will have available post-closing. In other words, the amount of cash in the bank, easily accessible savings, and other funds that can realistically be used for the project (not retirement accounts with penalties) after you have funded your equity injection in the project.\n\nWhy we need it:\n\nLiquidity shows how much cushion you have to handle start-up costs, working capital needs, and unexpected expenses. The SBA expects borrowers to have enough post-close liquidity to support the business, especially in the early months.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-pc-liquidity"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <CurrencyInput
                  value={applicant.pcLiquidity || ''}
                  onChange={(value) => updateApplicant('pcLiquidity', value)}
                  placeholder="0"
                  showDecimals={false}
                  data-testid="input-pc-liquidity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Required Income from Business
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Required Income from Business',
                      'What information is being requested:\n\nThe amount of money you would like to take from the business as personal compensation (salary, owner\'s draw, or distribution) after the loan closes—usually stated as an annual amount.\n\nWhy we need it:\n\nYour requested draw directly affects the business\'s cash flow and debt-service capacity. We use this figure in our cash flow projections to make sure the company can both pay you and comfortably repay the loan.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-req-draw"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <CurrencyInput
                  value={applicant.reqDraw || ''}
                  onChange={(value) => updateApplicant('reqDraw', value)}
                  placeholder="0"
                  showDecimals={false}
                  data-testid="input-req-draw"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                  Equity Injection Amount
                  <button
                    type="button"
                    onClick={() => handleLearnMore(
                      'Equity Injection Amount',
                      'What information is being requested:\n\nHow much of your own cash (or other acceptable equity) you will invest into the project or business purchase.\n\nWhy we need it:\n\nMost SBA loans require the borrower to contribute a minimum equity injection (a down payment). This shows your commitment, reduces the lender\'s risk, and improves the project\'s overall leverage position.'
                    )}
                    className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                    data-testid="button-learn-more-equity-injection"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </label>
                <CurrencyInput
                  value={applicant.equityInjectionAmount || ''}
                  onChange={(value) => updateApplicant('equityInjectionAmount', value)}
                  placeholder="0"
                  showDecimals={false}
                  data-testid="input-equity-injection-amount"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e5e7eb]">
            <Button
              onClick={handleBackToOwners}
              className="flex items-center justify-center gap-2"
              data-testid="button-done"
            >
              <ArrowLeft className="w-4 h-4" />
              Done - Back to All Owners
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </BDOLayout>
  );
}
