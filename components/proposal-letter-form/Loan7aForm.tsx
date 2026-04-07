interface Loan7aFormProps {
  data: {
    borrowerLegalName: string;
    businessName: string;
    guarantors: string;
    loanAmount: number;
    companionLoan: number;
    equityInjection: number;
    loanPurpose: string;
    termMonths: number;
    interestRate: number;
    rateType: string;
    rateAdjustmentPeriod: string;
    monthlyPayment: number;
    collateralDescription: string;
    prepaymentPenalty: string;
    insuranceRequirements: string[];
    thirdPartyReports: string;
    targetClosingDate: string;
    specialConditions: string;
  };
  onChange: (field: string, value: any) => void;
}

const LOAN_PURPOSES = [
  'Working Capital',
  'Real Estate Purchase',
  'Equipment Purchase',
  'Business Acquisition',
  'Refinance Debt',
  'Construction',
  'Leasehold Improvements',
  'Other'
];

const INSURANCE_OPTIONS = [
  'Property & Casualty',
  'Workers Compensation',
  'Life Insurance',
  'Flood Insurance',
  'Environmental Insurance'
];

export function Loan7aForm({ data, onChange }: Loan7aFormProps) {
  const handleInsuranceToggle = (insurance: string) => {
    const current = data.insuranceRequirements || [];
    const updated = current.includes(insurance)
      ? current.filter(i => i !== insurance)
      : [...current, insurance];
    onChange('insuranceRequirements', updated);
  };

  return (
    <div className="p-6 bg-white space-y-6">
      <h3 className="text-[18px] font-semibold text-[#1a1a1a]">SBA 7(a) Loan Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Borrower Legal Name <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={data.borrowerLegalName}
            onChange={(e) => onChange('borrowerLegalName', e.target.value)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-borrower-name"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Business Name (DBA)
          </label>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => onChange('businessName', e.target.value)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-business-name"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Guarantors (comma-separated) <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={data.guarantors}
            onChange={(e) => onChange('guarantors', e.target.value)}
            placeholder="John Doe, Jane Smith"
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-guarantors"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Loan Amount <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="number"
            value={data.loanAmount || ''}
            onChange={(e) => onChange('loanAmount', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-loan-amount"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Companion Loan (if applicable)
          </label>
          <input
            type="number"
            value={data.companionLoan || ''}
            onChange={(e) => onChange('companionLoan', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-companion-loan"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Equity Injection <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="number"
            value={data.equityInjection || ''}
            onChange={(e) => onChange('equityInjection', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-equity-injection"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Loan Purpose <span className="text-[#ef4444]">*</span>
          </label>
          <select
            value={data.loanPurpose}
            onChange={(e) => onChange('loanPurpose', e.target.value)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="select-7a-loan-purpose"
          >
            <option value="">Select purpose</option>
            {LOAN_PURPOSES.map(purpose => (
              <option key={purpose} value={purpose}>{purpose}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Term (months) <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="number"
            value={data.termMonths || ''}
            onChange={(e) => onChange('termMonths', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-term-months"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Interest Rate (%) <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={data.interestRate || ''}
            onChange={(e) => onChange('interestRate', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-interest-rate"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Rate Type <span className="text-[#ef4444]">*</span>
          </label>
          <select
            value={data.rateType}
            onChange={(e) => onChange('rateType', e.target.value)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="select-7a-rate-type"
          >
            <option value="">Select type</option>
            <option value="Fixed">Fixed</option>
            <option value="Variable">Variable</option>
          </select>
        </div>

        {data.rateType === 'Variable' && (
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Rate Adjustment Period
            </label>
            <input
              type="text"
              value={data.rateAdjustmentPeriod}
              onChange={(e) => onChange('rateAdjustmentPeriod', e.target.value)}
              placeholder="e.g., Monthly, Quarterly"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-7a-rate-adjustment"
            />
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Monthly Payment <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="number"
            value={data.monthlyPayment || ''}
            onChange={(e) => onChange('monthlyPayment', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-monthly-payment"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Target Closing Date
          </label>
          <input
            type="date"
            value={data.targetClosingDate}
            onChange={(e) => onChange('targetClosingDate', e.target.value)}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-closing-date"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Collateral Description <span className="text-[#ef4444]">*</span>
          </label>
          <textarea
            value={data.collateralDescription}
            onChange={(e) => onChange('collateralDescription', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="textarea-7a-collateral"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Prepayment Penalty <span className="text-[#ef4444]">*</span>
          </label>
          <input
            type="text"
            value={data.prepaymentPenalty}
            onChange={(e) => onChange('prepaymentPenalty', e.target.value)}
            placeholder='e.g., "None" or describe terms'
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="input-7a-prepayment"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-[#374151] mb-2">
            Insurance Requirements <span className="text-[#ef4444]">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {INSURANCE_OPTIONS.map(insurance => (
              <label key={insurance} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(data.insuranceRequirements || []).includes(insurance)}
                  onChange={() => handleInsuranceToggle(insurance)}
                  className="h-4 w-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#2563eb]"
                  data-testid={`checkbox-7a-insurance-${insurance.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <span className="text-[13px] text-[#374151]">{insurance}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Third Party Reports <span className="text-[#ef4444]">*</span>
          </label>
          <textarea
            value={data.thirdPartyReports}
            onChange={(e) => onChange('thirdPartyReports', e.target.value)}
            placeholder="e.g., Appraisal, Environmental Phase I, Title Report"
            rows={2}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="textarea-7a-third-party"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
            Special Conditions
          </label>
          <textarea
            value={data.specialConditions}
            onChange={(e) => onChange('specialConditions', e.target.value)}
            placeholder="Any loan-specific terms or conditions"
            rows={3}
            className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
            data-testid="textarea-7a-special-conditions"
          />
        </div>
      </div>
    </div>
  );
}
