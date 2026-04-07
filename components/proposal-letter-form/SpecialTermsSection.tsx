import { Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomCondition {
  id: string;
  condition: string;
}

interface StandardProvisions {
  covidContingency: boolean;
  irsVerification: boolean;
  usdaFinancialReporting: boolean;
  usdaTaxReturnFiling: boolean;
}

interface SpecialTermsSectionProps {
  standardProvisions: StandardProvisions;
  customConditions: CustomCondition[];
  expirationDays: number;
  onStandardChange: (provisions: StandardProvisions) => void;
  onCustomChange: (conditions: CustomCondition[]) => void;
  onExpirationChange: (days: number) => void;
}

export function SpecialTermsSection({
  standardProvisions,
  customConditions,
  expirationDays,
  onStandardChange,
  onCustomChange,
  onExpirationChange
}: SpecialTermsSectionProps) {
  const toggleProvision = (key: keyof StandardProvisions) => {
    onStandardChange({
      ...standardProvisions,
      [key]: !standardProvisions[key]
    });
  };

  const addCustomCondition = () => {
    const newCondition: CustomCondition = {
      id: `condition-${Date.now()}`,
      condition: ''
    };
    onCustomChange([...customConditions, newCondition]);
  };

  const updateCustomCondition = (id: string, value: string) => {
    onCustomChange(customConditions.map(cond =>
      cond.id === id ? { ...cond, condition: value } : cond
    ));
  };

  const removeCustomCondition = (id: string) => {
    onCustomChange(customConditions.filter(cond => cond.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-[#e5e7eb]">
        <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
        <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Special Terms & Conditions</h4>
      </div>

      {/* Proposal Expiration */}
      <div className="space-y-3">
        <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Proposal Validity</h5>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiration-days" className="text-[13px] font-medium text-[#1a1a1a]">
              Proposal Valid For (Days)
            </Label>
            <Input
              id="expiration-days"
              type="number"
              min="1"
              value={expirationDays}
              onChange={(e) => onExpirationChange(parseInt(e.target.value) || 10)}
              className="text-[14px]"
              data-testid="input-expiration-days"
            />
            <p className="text-[12px] text-[#6b7280]">
              This proposal will expire {expirationDays} days from the letter date
            </p>
          </div>
        </div>
      </div>

      {/* Standard Provisions */}
      <div className="space-y-3 pt-4 border-t border-[#e5e7eb]">
        <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Standard Provisions</h5>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-[#f9fafb] rounded-lg">
            <Checkbox
              id="covid-contingency"
              checked={standardProvisions.covidContingency}
              onCheckedChange={() => toggleProvision('covidContingency')}
              data-testid="checkbox-covid-contingency"
            />
            <div className="flex-1">
              <label
                htmlFor="covid-contingency"
                className="text-[13px] font-medium text-[#1a1a1a] cursor-pointer block mb-1"
              >
                COVID-19 Contingency
              </label>
              <p className="text-[12px] text-[#6b7280]">
                Includes standard COVID-19 business impact contingency language
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#f9fafb] rounded-lg">
            <Checkbox
              id="irs-verification"
              checked={standardProvisions.irsVerification}
              onCheckedChange={() => toggleProvision('irsVerification')}
              data-testid="checkbox-irs-verification"
            />
            <div className="flex-1">
              <label
                htmlFor="irs-verification"
                className="text-[13px] font-medium text-[#1a1a1a] cursor-pointer block mb-1"
              >
                IRS Tax Return Verification (Form 4506-C)
              </label>
              <p className="text-[12px] text-[#6b7280]">
                Requires IRS verification of filed tax returns
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#f9fafb] rounded-lg">
            <Checkbox
              id="usda-financial"
              checked={standardProvisions.usdaFinancialReporting}
              onCheckedChange={() => toggleProvision('usdaFinancialReporting')}
              data-testid="checkbox-usda-financial"
            />
            <div className="flex-1">
              <label
                htmlFor="usda-financial"
                className="text-[13px] font-medium text-[#1a1a1a] cursor-pointer block mb-1"
              >
                USDA Financial Reporting Requirements
              </label>
              <p className="text-[12px] text-[#6b7280]">
                Year-end financials within 90 days of fiscal year end
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#f9fafb] rounded-lg">
            <Checkbox
              id="usda-tax"
              checked={standardProvisions.usdaTaxReturnFiling}
              onCheckedChange={() => toggleProvision('usdaTaxReturnFiling')}
              data-testid="checkbox-usda-tax"
            />
            <div className="flex-1">
              <label
                htmlFor="usda-tax"
                className="text-[13px] font-medium text-[#1a1a1a] cursor-pointer block mb-1"
              >
                USDA Tax Return Filing Requirements
              </label>
              <p className="text-[12px] text-[#6b7280]">
                Tax returns submitted when filed (including extensions)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Conditions */}
      <div className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <div className="flex items-center justify-between">
          <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Custom Conditions</h5>
          <Button
            type="button"
            onClick={addCustomCondition}
            size="sm"
            variant="outline"
            className="gap-2"
            data-testid="button-add-custom-condition"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </Button>
        </div>

        {customConditions.length === 0 ? (
          <div className="text-center py-6 bg-[#f9fafb] rounded-lg border-2 border-dashed border-[#e5e7eb]">
            <p className="text-[13px] text-[#6b7280] mb-3">No custom conditions added</p>
            <Button
              type="button"
              onClick={addCustomCondition}
              size="sm"
              variant="outline"
              className="gap-2"
              data-testid="button-add-first-custom-condition"
            >
              <Plus className="w-4 h-4" />
              Add First Condition
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {customConditions.map((condition, index) => (
              <div key={condition.id} className="flex items-start gap-3 p-3 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
                <div className="flex-1">
                  <Input
                    value={condition.condition}
                    onChange={(e) => updateCustomCondition(condition.id, e.target.value)}
                    placeholder="Enter special term or condition..."
                    className="text-[13px]"
                    data-testid={`input-custom-condition-${index}`}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => removeCustomCondition(condition.id)}
                  size="icon"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  data-testid={`button-remove-custom-condition-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-[13px] text-amber-900">
            <p className="font-medium mb-1">Special Terms</p>
            <p className="text-amber-800">
              Add any special terms, conditions, or requirements specific to this loan proposal. These will be included in the proposal letter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
