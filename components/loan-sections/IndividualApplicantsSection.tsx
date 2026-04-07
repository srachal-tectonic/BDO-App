'use client';

import { useState, useEffect, useRef } from 'react';
import { useApplication } from '@/lib/applicationStore';
import { Plus, Trash2, ChevronDown, HelpCircle, ExternalLink } from 'lucide-react';
import AddressInput from '@/components/loan-sections/AddressInput';
import PasswordToggle from '@/components/loan-sections/PasswordToggle';
import LearnMorePanel, { IndirectOwnershipExplainer } from '@/components/LearnMorePanel';
import type { IndividualApplicant } from '@/lib/schema';

export default function IndividualApplicantsSection() {
  const { data, addIndividualApplicant, updateIndividualApplicant, removeIndividualApplicant } = useApplication();
  const { individualApplicants: rawIndividualApplicants } = data;

  // Provide safe defaults
  const individualApplicants = rawIndividualApplicants || [];

  const [expandedApplicants, setExpandedApplicants] = useState<string[]>([]);
  const [aboutSectionExpanded, setAboutSectionExpanded] = useState(true);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const hasInitialized = useRef(false);

  // Auto-expand first applicant only on initial load
  useEffect(() => {
    if (!hasInitialized.current && individualApplicants.length > 0) {
      setExpandedApplicants([individualApplicants[0].id]);
      hasInitialized.current = true;
    }
  }, [individualApplicants]);

  const toggleExpanded = (id: string) => {
    setExpandedApplicants(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const updateApplicant = (id: string, field: keyof IndividualApplicant, value: any) => {
    updateIndividualApplicant(id, { [field]: value } as any);
  };

  const handleAddApplicant = () => {
    const newApplicant: IndividualApplicant = {
      id: Date.now().toString(),
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      ssn: '',
      ownershipPercentage: 0,
      address: {
        street1: '',
        city: '',
        state: '',
        zipCode: '',
      },
      homeAddress: {
        street1: '',
        city: '',
        state: '',
        zipCode: '',
      },
    };
    addIndividualApplicant(newApplicant);
    setExpandedApplicants(prev => [...prev, newApplicant.id]);
  };

  return (
    <div>
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <h1 className="text-[28px] font-bold text-[#1a1a1a]">Individual Applicant Information</h1>
      </div>

      <div className="px-4 sm:px-6">
        {individualApplicants.map((applicant, index) => (
          <div
            key={applicant.id}
            className="bg-white border border-[#e5e7eb] rounded-lg p-4 sm:p-6 mb-6 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
          >
            <div
              className="flex justify-between items-center mb-5 cursor-pointer"
              onClick={() => toggleExpanded(applicant.id)}
            >
              <h3 className="text-lg font-medium text-[#1f2937] flex items-center gap-3">
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    expandedApplicants.includes(applicant.id) ? 'rotate-180' : ''
                  }`}
                />
                {applicant.firstName && applicant.lastName
                  ? `${applicant.firstName} ${applicant.lastName}`
                  : `Applicant ${index + 1}`}
              </h3>
              {individualApplicants.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeIndividualApplicant(applicant.id);
                  }}
                  className="min-h-[44px] px-3 sm:px-5 py-2.5 bg-white border-2 border-[#ef4444] text-[#ef4444] font-medium rounded-md cursor-pointer transition-all text-sm hover:bg-red-50 flex items-center gap-2"
                  data-testid={`button-delete-applicant-${applicant.id}`}
                  aria-label="Delete Applicant"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete Applicant</span>
                </button>
              )}
            </div>

            {expandedApplicants.includes(applicant.id) && (
              <div>
                {/* Personal Information Section */}
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-[#1f2937] mb-4 pb-2 border-b-2 border-[#2563eb]">
                    Personal Information
                  </h4>

                  {/* First Name, Middle Name, Last Name, Suffix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">First Name</label>
                      <input
                        type="text"
                        value={applicant.firstName}
                        onChange={(e) => updateApplicant(applicant.id, 'firstName', e.target.value)}
                        placeholder="First Name"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-firstname`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Middle Name</label>
                      <input
                        type="text"
                        value={applicant.middleName || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'middleName', e.target.value)}
                        placeholder="Middle Name"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-middlename`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Last Name</label>
                      <input
                        type="text"
                        value={applicant.lastName}
                        onChange={(e) => updateApplicant(applicant.id, 'lastName', e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-lastname`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Suffix</label>
                      <input
                        type="text"
                        value={applicant.suffix || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'suffix', e.target.value)}
                        placeholder="Jr., Sr., III, etc."
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-suffix`}
                      />
                    </div>
                  </div>

                  {/* SSN, Date of Birth, Phone, Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Social Security Number</label>
                      <PasswordToggle
                        id={`ssn-${applicant.id}`}
                        value={applicant.ssn}
                        onChange={(value) => updateApplicant(applicant.id, 'ssn', value)}
                        placeholder="XXX-XX-XXXX"
                        testId={`input-applicant-${applicant.id}-ssn`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={applicant.dateOfBirth || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'dateOfBirth', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-dob`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Phone</label>
                      <input
                        type="tel"
                        value={applicant.phone}
                        onChange={(e) => updateApplicant(applicant.id, 'phone', e.target.value)}
                        placeholder="(555) 555-5555"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-phone`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Email</label>
                      <input
                        type="email"
                        value={applicant.email}
                        onChange={(e) => updateApplicant(applicant.id, 'email', e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-email`}
                      />
                    </div>
                  </div>

                  {/* Home Address, Credit Score */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-[#374151] mb-2">Home Address</label>
                      <AddressInput
                        value={applicant.homeAddress || applicant.address}
                        onChange={(addr) => updateApplicant(applicant.id, 'homeAddress', addr)}
                        idPrefix={`applicant-${applicant.id}-home`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                        Estimated Credit Score
                        <button
                          type="button"
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-credit-score"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.estimatedCreditScore || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'estimatedCreditScore', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-applicant-${applicant.id}-credit-score`}
                      >
                        <option value="">Select Credit Score Range</option>
                        <option value="750+">750+</option>
                        <option value="700-749">700-749</option>
                        <option value="650-699">650-699</option>
                        <option value="600-649">600-649</option>
                        <option value="below-600">Below 600</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Project & Business Involvement Section */}
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-[#1f2937] mb-4 pb-2 border-b-2 border-[#2563eb]">
                    Project & Business Involvement
                  </h4>

                  {/* Project Role, Ownership %, Ownership Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                        Project Role
                        <button
                          type="button"
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-project-role"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.projectRole || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'projectRole', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-project-role-${applicant.id}`}
                      >
                        <option value="">Select Project Role</option>
                        <option value="owner-guarantor">Owner & Guarantor</option>
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
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-ownership"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <input
                        type="number"
                        value={applicant.ownershipPercentage || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'ownershipPercentage', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-ownership`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                        Ownership Type
                        <button
                          type="button"
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-ownership-type"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.ownershipType || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'ownershipType', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-ownership-type-${applicant.id}`}
                      >
                        <option value="">Select Ownership Type</option>
                        <option value="direct">Direct Ownership</option>
                        <option value="indirect">Through an Entity</option>
                      </select>
                    </div>
                  </div>

                  {/* Title, Indirect Ownership Description (conditional) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2">Title</label>
                      <input
                        type="text"
                        value={applicant.title || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'title', e.target.value)}
                        placeholder="e.g., CEO, President, Partner"
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`input-applicant-${applicant.id}-title`}
                      />
                    </div>
                    {applicant.ownershipType === 'indirect' && (
                      <div>
                        <label className="block text-sm font-medium text-[#374151] mb-2">Indirect Ownership Description</label>
                        <textarea
                          value={applicant.indirectOwnershipDescription || ''}
                          onChange={(e) => updateApplicant(applicant.id, 'indirectOwnershipDescription', e.target.value)}
                          placeholder="Describe the ownership structure..."
                          rows={3}
                          className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] resize-none"
                          data-testid={`textarea-applicant-${applicant.id}-indirect-ownership`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Role in Business Operations, Travel Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                        Role in Business Operations
                        <button
                          type="button"
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-business-role"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.businessRole || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'businessRole', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-business-role-${applicant.id}`}
                      >
                        <option value="">Select Role in Business Operations</option>
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
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-travel-time"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.travelTime || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'travelTime', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-applicant-${applicant.id}-travel-time`}
                      >
                        <option value="">Select Travel Time</option>
                        <option value="less than 30 minutes">Less than 30 minutes</option>
                        <option value="30 to 60 minutes">30 to 60 minutes</option>
                        <option value="60 to 120 minutes">60 to 120 minutes</option>
                        <option value="more than 120 minutes">More than 120 minutes</option>
                      </select>
                    </div>
                  </div>

                  {/* Relevant Experience, Years of Experience */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                        Relevant Experience
                        <button
                          type="button"
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-experience"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.experience || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'experience', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-applicant-${applicant.id}-experience`}
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
                          className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                          data-testid="button-learn-more-years-experience"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </label>
                      <select
                        value={applicant.yearsOfExperience || ''}
                        onChange={(e) => updateApplicant(applicant.id, 'yearsOfExperience', e.target.value)}
                        className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        data-testid={`select-applicant-${applicant.id}-years-experience`}
                      >
                        <option value="">Select Years of Experience</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">More than 10</option>
                      </select>
                    </div>
                  </div>

                  {/* Role Description Textarea */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#374151] mb-2">
                      Describe your role in the business and how your experience qualifies you for it.
                    </label>
                    <textarea
                      value={applicant.businessRoleDescription || ''}
                      onChange={(e) => updateApplicant(applicant.id, 'businessRoleDescription', e.target.value)}
                      placeholder="Describe your responsibilities and relevant qualifications..."
                      rows={4}
                      className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] resize-none"
                      data-testid={`textarea-applicant-${applicant.id}-role-description`}
                    />
                  </div>

                  {/* Plan to be On-Site */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#374151] mb-2 flex items-center gap-2">
                      Plan to be On-Site
                      <button
                        type="button"
                        className="text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
                        data-testid="button-learn-more-onsite"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </label>
                    <textarea
                      value={applicant.planToBeOnSite || ''}
                      onChange={(e) => updateApplicant(applicant.id, 'planToBeOnSite', e.target.value)}
                      placeholder="Please explain how you plan to manage the distance"
                      rows={3}
                      className="w-full px-4 py-3 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] resize-none"
                      data-testid={`textarea-applicant-${applicant.id}-onsite`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={handleAddApplicant}
          className="w-full py-4 bg-white border-2 border-dashed border-[#2563eb] text-[#2563eb] font-medium rounded-lg cursor-pointer transition-all hover:bg-blue-50 mb-8"
          data-testid="button-add-individual"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          Add Individual
        </button>
      </div>

      {/* Learn More Panel */}
      <LearnMorePanel
        isOpen={isLearnMoreOpen}
        onClose={() => setIsLearnMoreOpen(false)}
        title="Understanding Indirect Ownership"
      >
        <IndirectOwnershipExplainer />
      </LearnMorePanel>
    </div>
  );
}
