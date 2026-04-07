import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loan504Data } from "../ProposalLetterForm";

interface Loan504FormProps {
  data: Loan504Data;
  onChange: (data: Loan504Data) => void;
}

export function Loan504Form({ data, onChange }: Loan504FormProps) {
  const handleFieldChange = (field: keyof Loan504Data, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleInterimChange = (field: string, value: any) => {
    onChange({
      ...data,
      interimLoan: { ...data.interimLoan, [field]: value }
    });
  };

  const handlePermanentChange = (field: string, value: any) => {
    onChange({
      ...data,
      permanentFirstLoan: { ...data.permanentFirstLoan, [field]: value }
    });
  };

  const handleCdcChange = (field: string, value: any) => {
    onChange({
      ...data,
      cdcLoan: { ...data.cdcLoan, [field]: value }
    });
  };

  return (
    <div className="p-6 space-y-8">
      {/* Loan Structure Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#e5e7eb]">
          <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
          <h4 className="text-[15px] font-semibold text-[#1a1a1a]">504 Loan Structure</h4>
        </div>
        
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="loan-structure" className="text-[13px] font-medium text-[#1a1a1a]">
              Loan Structure
            </Label>
            <Select 
              value={data.structure} 
              onValueChange={(value) => handleFieldChange('structure', value)}
            >
              <SelectTrigger id="loan-structure" data-testid="select-loan-structure">
                <SelectValue placeholder="Select loan structure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interim">Interim Loan Only</SelectItem>
                <SelectItem value="permanent-first">Permanent First Loan Only</SelectItem>
                <SelectItem value="cdc-second">CDC Second Loan Only</SelectItem>
                <SelectItem value="all-three">All Three Loans</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[12px] text-[#6b7280]">
              Select which 504 loan structure(s) to include in this proposal
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description" className="text-[13px] font-medium text-[#1a1a1a]">
              Project Description
            </Label>
            <Input
              id="project-description"
              value={data.projectDescription}
              onChange={(e) => handleFieldChange('projectDescription', e.target.value)}
              placeholder="e.g., Purchase and renovation of commercial property"
              className="text-[14px]"
              data-testid="input-project-description"
            />
          </div>
        </div>
      </div>

      {/* Interim Loan Section */}
      {(data.structure === 'interim' || data.structure === 'all-three') && (
        <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
            <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Interim Loan Details</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interim-amount" className="text-[13px] font-medium text-[#1a1a1a]">
                Loan Amount
              </Label>
              <Input
                id="interim-amount"
                type="number"
                value={data.interimLoan.loanAmount ?? ''}
                onChange={(e) => handleInterimChange('loanAmount', e.target.value)}
                placeholder="0.00"
                className="text-[14px]"
                data-testid="input-interim-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interim-rate" className="text-[13px] font-medium text-[#1a1a1a]">
                Interest Rate (%)
              </Label>
              <Input
                id="interim-rate"
                type="number"
                step="0.01"
                value={data.interimLoan.interestRate}
                onChange={(e) => handleInterimChange('interestRate', e.target.value)}
                placeholder="0.00"
                className="text-[14px]"
                data-testid="input-interim-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interim-term" className="text-[13px] font-medium text-[#1a1a1a]">
                Term (months)
              </Label>
              <Input
                id="interim-term"
                type="number"
                value={data.interimLoan.termMonths}
                onChange={(e) => handleInterimChange('termMonths', e.target.value)}
                placeholder="0"
                className="text-[14px]"
                data-testid="input-interim-term"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interim-payment-type" className="text-[13px] font-medium text-[#1a1a1a]">
                Payment Type
              </Label>
              <Select 
                value={data.interimLoan.paymentType} 
                onValueChange={(value) => handleInterimChange('paymentType', value)}
              >
                <SelectTrigger id="interim-payment-type" data-testid="select-interim-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interest-only">Interest Only</SelectItem>
                  <SelectItem value="principal-interest">Principal & Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interim-collateral" className="text-[13px] font-medium text-[#1a1a1a]">
                Collateral
              </Label>
              <Input
                id="interim-collateral"
                value={data.interimLoan.collateral}
                onChange={(e) => handleInterimChange('collateral', e.target.value)}
                placeholder="e.g., First lien on project property"
                className="text-[14px]"
                data-testid="input-interim-collateral"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interim-maturity" className="text-[13px] font-medium text-[#1a1a1a]">
                Maturity Date
              </Label>
              <Input
                id="interim-maturity"
                type="date"
                value={data.interimLoan.maturityDate}
                onChange={(e) => handleInterimChange('maturityDate', e.target.value)}
                className="text-[14px]"
                data-testid="input-interim-maturity"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interim-purpose" className="text-[13px] font-medium text-[#1a1a1a]">
                Purpose
              </Label>
              <Input
                id="interim-purpose"
                value={data.interimLoan.purpose}
                onChange={(e) => handleInterimChange('purpose', e.target.value)}
                placeholder="e.g., Bridge financing during construction"
                className="text-[14px]"
                data-testid="input-interim-purpose"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interim-repayment" className="text-[13px] font-medium text-[#1a1a1a]">
                Repayment Source
              </Label>
              <Input
                id="interim-repayment"
                value={data.interimLoan.repaymentSource}
                onChange={(e) => handleInterimChange('repaymentSource', e.target.value)}
                placeholder="e.g., Refinanced by permanent loans"
                className="text-[14px]"
                data-testid="input-interim-repayment"
              />
            </div>
          </div>
        </div>
      )}

      {/* Permanent First Loan Section */}
      {(data.structure === 'permanent-first' || data.structure === 'all-three') && (
        <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-2 h-2 rounded-full bg-[#10b981]"></div>
            <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Permanent First Loan Details</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permanent-amount" className="text-[13px] font-medium text-[#1a1a1a]">
                Loan Amount
              </Label>
              <Input
                id="permanent-amount"
                type="number"
                value={data.permanentFirstLoan.loanAmount ?? ''}
                onChange={(e) => handlePermanentChange('loanAmount', e.target.value)}
                placeholder="0.00"
                className="text-[14px]"
                data-testid="input-permanent-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-rate" className="text-[13px] font-medium text-[#1a1a1a]">
                Interest Rate (%)
              </Label>
              <Input
                id="permanent-rate"
                type="number"
                step="0.01"
                value={data.permanentFirstLoan.interestRate}
                onChange={(e) => handlePermanentChange('interestRate', e.target.value)}
                placeholder="0.00"
                className="text-[14px]"
                data-testid="input-permanent-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-term" className="text-[13px] font-medium text-[#1a1a1a]">
                Term (months)
              </Label>
              <Input
                id="permanent-term"
                type="number"
                value={data.permanentFirstLoan.termMonths}
                onChange={(e) => handlePermanentChange('termMonths', e.target.value)}
                placeholder="0"
                className="text-[14px]"
                data-testid="input-permanent-term"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-amortization" className="text-[13px] font-medium text-[#1a1a1a]">
                Amortization (months)
              </Label>
              <Input
                id="permanent-amortization"
                type="number"
                value={data.permanentFirstLoan.amortizationMonths}
                onChange={(e) => handlePermanentChange('amortizationMonths', e.target.value)}
                placeholder="0"
                className="text-[14px]"
                data-testid="input-permanent-amortization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-collateral" className="text-[13px] font-medium text-[#1a1a1a]">
                Collateral
              </Label>
              <Input
                id="permanent-collateral"
                value={data.permanentFirstLoan.collateral}
                onChange={(e) => handlePermanentChange('collateral', e.target.value)}
                placeholder="e.g., First lien on project property"
                className="text-[14px]"
                data-testid="input-permanent-collateral"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-guarantee" className="text-[13px] font-medium text-[#1a1a1a]">
                Guarantee
              </Label>
              <Input
                id="permanent-guarantee"
                value={data.permanentFirstLoan.guarantee}
                onChange={(e) => handlePermanentChange('guarantee', e.target.value)}
                placeholder="e.g., Personal guarantees from principals"
                className="text-[14px]"
                data-testid="input-permanent-guarantee"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-purpose" className="text-[13px] font-medium text-[#1a1a1a]">
                Purpose
              </Label>
              <Input
                id="permanent-purpose"
                value={data.permanentFirstLoan.purpose}
                onChange={(e) => handlePermanentChange('purpose', e.target.value)}
                placeholder="e.g., Permanent financing of project"
                className="text-[14px]"
                data-testid="input-permanent-purpose"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent-takeout" className="text-[13px] font-medium text-[#1a1a1a]">
                Take-out Date
              </Label>
              <Input
                id="permanent-takeout"
                type="date"
                value={data.permanentFirstLoan.takeoutDate}
                onChange={(e) => handlePermanentChange('takeoutDate', e.target.value)}
                className="text-[14px]"
                data-testid="input-permanent-takeout"
              />
            </div>
          </div>
        </div>
      )}

      {/* CDC Second Loan Section */}
      {(data.structure === 'cdc-second' || data.structure === 'all-three') && (
        <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
          <div className="flex items-center gap-2 pb-2">
            <div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div>
            <h4 className="text-[15px] font-semibold text-[#1a1a1a]">CDC Second Loan Details</h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cdc-amount" className="text-[13px] font-medium text-[#1a1a1a]">
                Loan Amount
              </Label>
              <Input
                id="cdc-amount"
                type="number"
                value={data.cdcLoan.loanAmount ?? ''}
                onChange={(e) => handleCdcChange('loanAmount', e.target.value)}
                placeholder="0.00"
                className="text-[14px]"
                data-testid="input-cdc-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-rate" className="text-[13px] font-medium text-[#1a1a1a]">
                Interest Rate (%)
              </Label>
              <Input
                id="cdc-rate"
                type="number"
                step="0.01"
                value={data.cdcLoan.interestRate}
                onChange={(e) => handleCdcChange('interestRate', e.target.value)}
                placeholder="0.00"
                className="text-[14px]"
                data-testid="input-cdc-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-term" className="text-[13px] font-medium text-[#1a1a1a]">
                Term (years)
              </Label>
              <Select 
                value={data.cdcLoan.termYears?.toString()} 
                onValueChange={(value) => handleCdcChange('termYears', parseInt(value))}
              >
                <SelectTrigger id="cdc-term" data-testid="select-cdc-term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 years</SelectItem>
                  <SelectItem value="20">20 years</SelectItem>
                  <SelectItem value="25">25 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-collateral" className="text-[13px] font-medium text-[#1a1a1a]">
                Collateral
              </Label>
              <Input
                id="cdc-collateral"
                value={data.cdcLoan.collateral}
                onChange={(e) => handleCdcChange('collateral', e.target.value)}
                placeholder="e.g., Second lien on project property"
                className="text-[14px]"
                data-testid="input-cdc-collateral"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-guarantee" className="text-[13px] font-medium text-[#1a1a1a]">
                SBA Guarantee (%)
              </Label>
              <Input
                id="cdc-guarantee"
                type="number"
                value={data.cdcLoan.sbaGuarantee}
                onChange={(e) => handleCdcChange('sbaGuarantee', e.target.value)}
                placeholder="100"
                className="text-[14px]"
                data-testid="input-cdc-guarantee"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-name" className="text-[13px] font-medium text-[#1a1a1a]">
                CDC Name
              </Label>
              <Input
                id="cdc-name"
                value={data.cdcLoan.cdcName}
                onChange={(e) => handleCdcChange('cdcName', e.target.value)}
                placeholder="e.g., Local Certified Development Company"
                className="text-[14px]"
                data-testid="input-cdc-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-purpose" className="text-[13px] font-medium text-[#1a1a1a]">
                Purpose
              </Label>
              <Input
                id="cdc-purpose"
                value={data.cdcLoan.purpose}
                onChange={(e) => handleCdcChange('purpose', e.target.value)}
                placeholder="e.g., 504 debenture financing"
                className="text-[14px]"
                data-testid="input-cdc-purpose"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cdc-debenture" className="text-[13px] font-medium text-[#1a1a1a]">
                Debenture Rate
              </Label>
              <Input
                id="cdc-debenture"
                value={data.cdcLoan.debentureRate}
                onChange={(e) => handleCdcChange('debentureRate', e.target.value)}
                placeholder="e.g., Fixed at current market rate"
                className="text-[14px]"
                data-testid="input-cdc-debenture"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
