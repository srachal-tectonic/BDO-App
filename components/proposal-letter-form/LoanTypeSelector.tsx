interface LoanTypeSelectorProps {
  loanTypes: { sba7a: boolean; sba504: boolean; usdaBI: boolean };
  onChange: (loanTypes: { sba7a: boolean; sba504: boolean; usdaBI: boolean }) => void;
}

export function LoanTypeSelector({ loanTypes, onChange }: LoanTypeSelectorProps) {
  return (
    <div className="p-6 bg-white">
      <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-4">Select Loan Type(s)</h3>
      <p className="text-[13px] text-[#6b7280] mb-4">
        Choose one or more loan programs. You can combine 7(a) + 504 for larger projects.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="relative flex items-start p-4 border-2 border-[#e5e7eb] rounded-lg cursor-pointer hover-elevate">
          <input
            type="checkbox"
            checked={loanTypes.sba7a}
            onChange={(e) => onChange({ ...loanTypes, sba7a: e.target.checked })}
            className="mt-0.5 h-4 w-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#2563eb]"
            data-testid="checkbox-loan-type-7a"
          />
          <div className="ml-3 flex-1">
            <div className="text-[14px] font-semibold text-[#1a1a1a]">SBA 7(a) Loan</div>
            <p className="text-[12px] text-[#6b7280] mt-1">
              General purpose loans up to $5M for working capital, equipment, real estate, or acquisition
            </p>
          </div>
        </label>

        <label className="relative flex items-start p-4 border-2 border-[#e5e7eb] rounded-lg cursor-pointer hover-elevate">
          <input
            type="checkbox"
            checked={loanTypes.sba504}
            onChange={(e) => onChange({ ...loanTypes, sba504: e.target.checked })}
            className="mt-0.5 h-4 w-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#2563eb]"
            data-testid="checkbox-loan-type-504"
          />
          <div className="ml-3 flex-1">
            <div className="text-[14px] font-semibold text-[#1a1a1a]">SBA 504 Loan</div>
            <p className="text-[12px] text-[#6b7280] mt-1">
              Real estate & equipment financing with interim, permanent, and CDC structure
            </p>
          </div>
        </label>

        <label className="relative flex items-start p-4 border-2 border-[#e5e7eb] rounded-lg cursor-pointer hover-elevate">
          <input
            type="checkbox"
            checked={loanTypes.usdaBI}
            onChange={(e) => onChange({ ...loanTypes, usdaBI: e.target.checked })}
            className="mt-0.5 h-4 w-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#2563eb]"
            data-testid="checkbox-loan-type-usda"
          />
          <div className="ml-3 flex-1">
            <div className="text-[14px] font-semibold text-[#1a1a1a]">USDA B&I Loan</div>
            <p className="text-[12px] text-[#6b7280] mt-1">
              Business & Industry loans for rural businesses with USDA guarantee
            </p>
          </div>
        </label>
      </div>

      {(loanTypes.sba7a && loanTypes.sba504) && (
        <div className="mt-4 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg">
          <p className="text-[13px] text-[#1e40af]">
            <strong>Combination Loan:</strong> You've selected both 7(a) and 504. This is common for large projects where 
            the 7(a) covers working capital/equipment and 504 finances real estate.
          </p>
        </div>
      )}

      {!loanTypes.sba7a && !loanTypes.sba504 && !loanTypes.usdaBI && (
        <div className="mt-4 p-3 bg-[#fef3c7] border border-[#fde68a] rounded-lg">
          <p className="text-[13px] text-[#92400e]">
            Please select at least one loan type to continue.
          </p>
        </div>
      )}
    </div>
  );
}
