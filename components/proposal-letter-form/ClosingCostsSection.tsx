import { Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Fee {
  id: string;
  feeType: string;
  amount: number;
}

interface ClosingCostsSectionProps {
  fees: Fee[];
  onChange: (fees: Fee[]) => void;
}

const feeTypes = [
  'SBA Guarantee Fee',
  'USDA Guarantee Fee',
  'CDC Processing Fee',
  'Lender Origination Fee',
  'Lender Processing Fee',
  'Appraisal Fee',
  'Environmental Report Fee',
  'Title Insurance',
  'Recording Fees',
  'Legal Fees',
  'Survey Fee',
  'Inspection Fees',
  'Other Third-Party Costs'
];

export function ClosingCostsSection({ fees, onChange }: ClosingCostsSectionProps) {
  const addFee = () => {
    const newFee: Fee = {
      id: `fee-${Date.now()}`,
      feeType: 'Lender Origination Fee',
      amount: 0
    };
    onChange([...fees, newFee]);
  };

  const removeFee = (id: string) => {
    onChange(fees.filter(fee => fee.id !== id));
  };

  const updateFee = (id: string, field: keyof Fee, value: any) => {
    onChange(fees.map(fee => 
      fee.id === id ? { ...fee, [field]: value } : fee
    ));
  };

  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
          <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Estimated Closing Costs (Exhibit B)</h4>
        </div>
        <Button
          type="button"
          onClick={addFee}
          size="sm"
          className="gap-2"
          data-testid="button-add-fee"
        >
          <Plus className="w-4 h-4" />
          Add Fee
        </Button>
      </div>

      {fees.length === 0 ? (
        <div className="text-center py-8 bg-[#f9fafb] rounded-lg border-2 border-dashed border-[#e5e7eb]">
          <p className="text-[14px] text-[#6b7280] mb-3">No closing costs added yet</p>
          <Button
            type="button"
            onClick={addFee}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-add-first-fee"
          >
            <Plus className="w-4 h-4" />
            Add First Fee
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {fees.map((fee, index) => (
              <div
                key={fee.id}
                className="p-4 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] flex items-center gap-4"
              >
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`fee-type-${fee.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                      Fee Type
                    </Label>
                    <Select 
                      value={fee.feeType} 
                      onValueChange={(value) => updateFee(fee.id, 'feeType', value)}
                    >
                      <SelectTrigger id={`fee-type-${fee.id}`} data-testid={`select-fee-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {feeTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`fee-amount-${fee.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                      Amount
                    </Label>
                    <Input
                      id={`fee-amount-${fee.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={fee.amount}
                      onChange={(e) => updateFee(fee.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-[14px]"
                      data-testid={`input-fee-amount-${index}`}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => removeFee(fee.id)}
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  data-testid={`button-remove-fee-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#eff6ff] to-white border-2 border-[#2563eb] rounded-lg">
            <span className="text-[15px] font-semibold text-[#1a1a1a]">Total Closing Costs:</span>
            <span className="text-[18px] font-bold text-[#2563eb]" data-testid="text-total-fees">
              {formatCurrency(totalFees)}
            </span>
          </div>

          <div className="pt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-[13px] text-amber-900">
                  <p className="font-medium mb-1">Estimated Costs</p>
                  <p className="text-amber-800">
                    These are estimated closing costs. Actual costs may vary. Some fees may be payable at application or during processing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
