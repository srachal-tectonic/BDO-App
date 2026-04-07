import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoanUsdaData } from "../ProposalLetterForm";

interface LoanUsdaFormProps {
  data: LoanUsdaData;
  onChange: (data: LoanUsdaData) => void;
}

export function LoanUsdaForm({ data, onChange }: LoanUsdaFormProps) {
  const handleFieldChange = (field: keyof LoanUsdaData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-[#e5e7eb]">
        <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
        <h4 className="text-[15px] font-semibold text-[#1a1a1a]">USDA B&I Loan Details</h4>
      </div>

      {/* Basic Loan Information */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="usda-amount" className="text-[13px] font-medium text-[#1a1a1a]">
            Loan Amount
          </Label>
          <Input
            id="usda-amount"
            type="number"
            value={data.loanAmount ?? ''}
            onChange={(e) => handleFieldChange('loanAmount', e.target.value)}
            placeholder="0.00"
            className="text-[14px]"
            data-testid="input-usda-amount"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="usda-rate" className="text-[13px] font-medium text-[#1a1a1a]">
            Interest Rate (%)
          </Label>
          <Input
            id="usda-rate"
            type="number"
            step="0.01"
            value={data.interestRate}
            onChange={(e) => handleFieldChange('interestRate', e.target.value)}
            placeholder="0.00"
            className="text-[14px]"
            data-testid="input-usda-rate"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="usda-guarantee" className="text-[13px] font-medium text-[#1a1a1a]">
            USDA Guarantee (%)
          </Label>
          <Select 
            value={data.guaranteePercentage?.toString()} 
            onValueChange={(value) => handleFieldChange('guaranteePercentage', parseInt(value))}
          >
            <SelectTrigger id="usda-guarantee" data-testid="select-usda-guarantee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="80">80%</SelectItem>
              <SelectItem value="90">90%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="usda-term" className="text-[13px] font-medium text-[#1a1a1a]">
            Term (years)
          </Label>
          <Input
            id="usda-term"
            type="number"
            value={data.termYears}
            onChange={(e) => handleFieldChange('termYears', e.target.value)}
            placeholder="0"
            className="text-[14px]"
            data-testid="input-usda-term"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="usda-amortization" className="text-[13px] font-medium text-[#1a1a1a]">
            Amortization (years)
          </Label>
          <Input
            id="usda-amortization"
            type="number"
            value={data.amortizationYears}
            onChange={(e) => handleFieldChange('amortizationYears', e.target.value)}
            placeholder="0"
            className="text-[14px]"
            data-testid="input-usda-amortization"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="usda-purpose" className="text-[13px] font-medium text-[#1a1a1a]">
            Purpose
          </Label>
          <Input
            id="usda-purpose"
            value={data.purpose}
            onChange={(e) => handleFieldChange('purpose', e.target.value)}
            placeholder="e.g., Business expansion in rural area"
            className="text-[14px]"
            data-testid="input-usda-purpose"
          />
        </div>
      </div>

      {/* Collateral & Security */}
      <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Collateral & Security</h5>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usda-collateral" className="text-[13px] font-medium text-[#1a1a1a]">
              Collateral Description
            </Label>
            <Input
              id="usda-collateral"
              value={data.collateral}
              onChange={(e) => handleFieldChange('collateral', e.target.value)}
              placeholder="e.g., First lien on all project assets"
              className="text-[14px]"
              data-testid="input-usda-collateral"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-guarantee-type" className="text-[13px] font-medium text-[#1a1a1a]">
              Personal Guarantee
            </Label>
            <Input
              id="usda-guarantee-type"
              value={data.personalGuarantee}
              onChange={(e) => handleFieldChange('personalGuarantee', e.target.value)}
              placeholder="e.g., Unlimited personal guarantees"
              className="text-[14px]"
              data-testid="input-usda-guarantee-type"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-lien-position" className="text-[13px] font-medium text-[#1a1a1a]">
              Lien Position
            </Label>
            <Input
              id="usda-lien-position"
              value={data.lienPosition}
              onChange={(e) => handleFieldChange('lienPosition', e.target.value)}
              placeholder="e.g., First lien"
              className="text-[14px]"
              data-testid="input-usda-lien-position"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-tangible-balance" className="text-[13px] font-medium text-[#1a1a1a]">
              Tangible Balance Sheet Equity (%)
            </Label>
            <Input
              id="usda-tangible-balance"
              type="number"
              value={data.tangibleBalanceSheetEquity}
              onChange={(e) => handleFieldChange('tangibleBalanceSheetEquity', e.target.value)}
              placeholder="0"
              className="text-[14px]"
              data-testid="input-usda-tangible-balance"
            />
          </div>
        </div>
      </div>

      {/* Project & Eligibility */}
      <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Project & Eligibility</h5>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usda-project-location" className="text-[13px] font-medium text-[#1a1a1a]">
              Project Location (Rural Area)
            </Label>
            <Input
              id="usda-project-location"
              value={data.projectLocation}
              onChange={(e) => handleFieldChange('projectLocation', e.target.value)}
              placeholder="e.g., City, State"
              className="text-[14px]"
              data-testid="input-usda-project-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-job-creation" className="text-[13px] font-medium text-[#1a1a1a]">
              Jobs Created/Retained
            </Label>
            <Input
              id="usda-job-creation"
              type="number"
              value={data.jobsCreatedRetained}
              onChange={(e) => handleFieldChange('jobsCreatedRetained', e.target.value)}
              placeholder="0"
              className="text-[14px]"
              data-testid="input-usda-job-creation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-eligibility" className="text-[13px] font-medium text-[#1a1a1a]">
              Eligibility Criteria
            </Label>
            <Input
              id="usda-eligibility"
              value={data.eligibilityCriteria}
              onChange={(e) => handleFieldChange('eligibilityCriteria', e.target.value)}
              placeholder="e.g., Meets USDA rural definition"
              className="text-[14px]"
              data-testid="input-usda-eligibility"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-community-benefit" className="text-[13px] font-medium text-[#1a1a1a]">
              Community Benefit
            </Label>
            <Input
              id="usda-community-benefit"
              value={data.communityBenefit}
              onChange={(e) => handleFieldChange('communityBenefit', e.target.value)}
              placeholder="e.g., Economic development in underserved area"
              className="text-[14px]"
              data-testid="input-usda-community-benefit"
            />
          </div>
        </div>
      </div>

      {/* Fees & Requirements */}
      <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Fees & Requirements</h5>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usda-guarantee-fee" className="text-[13px] font-medium text-[#1a1a1a]">
              Guarantee Fee
            </Label>
            <Input
              id="usda-guarantee-fee"
              value={data.guaranteeFee}
              onChange={(e) => handleFieldChange('guaranteeFee', e.target.value)}
              placeholder="e.g., 3% of guaranteed portion"
              className="text-[14px]"
              data-testid="input-usda-guarantee-fee"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-annual-fee" className="text-[13px] font-medium text-[#1a1a1a]">
              Annual Renewal Fee
            </Label>
            <Input
              id="usda-annual-fee"
              value={data.annualRenewalFee}
              onChange={(e) => handleFieldChange('annualRenewalFee', e.target.value)}
              placeholder="e.g., 0.25% annually"
              className="text-[14px]"
              data-testid="input-usda-annual-fee"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-equity-injection" className="text-[13px] font-medium text-[#1a1a1a]">
              Required Equity Injection (%)
            </Label>
            <Input
              id="usda-equity-injection"
              type="number"
              value={data.equityInjectionRequired}
              onChange={(e) => handleFieldChange('equityInjectionRequired', e.target.value)}
              placeholder="0"
              className="text-[14px]"
              data-testid="input-usda-equity-injection"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-equity-source" className="text-[13px] font-medium text-[#1a1a1a]">
              Equity Source
            </Label>
            <Input
              id="usda-equity-source"
              value={data.equitySource}
              onChange={(e) => handleFieldChange('equitySource', e.target.value)}
              placeholder="e.g., Owner cash injection"
              className="text-[14px]"
              data-testid="input-usda-equity-source"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-environmental" className="text-[13px] font-medium text-[#1a1a1a]">
              Environmental Review Status
            </Label>
            <Input
              id="usda-environmental"
              value={data.environmentalReview}
              onChange={(e) => handleFieldChange('environmentalReview', e.target.value)}
              placeholder="e.g., Phase I completed, pending approval"
              className="text-[14px]"
              data-testid="input-usda-environmental"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-feasibility" className="text-[13px] font-medium text-[#1a1a1a]">
              Feasibility Study
            </Label>
            <Input
              id="usda-feasibility"
              value={data.feasibilityStudy}
              onChange={(e) => handleFieldChange('feasibilityStudy', e.target.value)}
              placeholder="e.g., Required for projects over $1M"
              className="text-[14px]"
              data-testid="input-usda-feasibility"
            />
          </div>
        </div>
      </div>

      {/* Additional Terms */}
      <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Additional Terms</h5>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usda-working-capital" className="text-[13px] font-medium text-[#1a1a1a]">
              Working Capital Requirements
            </Label>
            <Input
              id="usda-working-capital"
              value={data.workingCapitalRequirements}
              onChange={(e) => handleFieldChange('workingCapitalRequirements', e.target.value)}
              placeholder="e.g., Minimum 1.25:1 current ratio"
              className="text-[14px]"
              data-testid="input-usda-working-capital"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-debt-service" className="text-[13px] font-medium text-[#1a1a1a]">
              Debt Service Coverage Ratio
            </Label>
            <Input
              id="usda-debt-service"
              value={data.debtServiceCoverage}
              onChange={(e) => handleFieldChange('debtServiceCoverage', e.target.value)}
              placeholder="e.g., Minimum 1.25:1"
              className="text-[14px]"
              data-testid="input-usda-debt-service"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-disbursement" className="text-[13px] font-medium text-[#1a1a1a]">
              Disbursement Terms
            </Label>
            <Input
              id="usda-disbursement"
              value={data.disbursementTerms}
              onChange={(e) => handleFieldChange('disbursementTerms', e.target.value)}
              placeholder="e.g., Draw schedule based on milestones"
              className="text-[14px]"
              data-testid="input-usda-disbursement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="usda-special-conditions" className="text-[13px] font-medium text-[#1a1a1a]">
              Special Conditions
            </Label>
            <Input
              id="usda-special-conditions"
              value={data.specialConditions}
              onChange={(e) => handleFieldChange('specialConditions', e.target.value)}
              placeholder="e.g., USDA approval required before closing"
              className="text-[14px]"
              data-testid="input-usda-special-conditions"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
