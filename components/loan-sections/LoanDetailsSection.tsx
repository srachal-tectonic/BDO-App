'use client';

// TODO: Loan details will be stored in the database
// Store loan calculations and payment information with the application document

interface LoanDetails {
  type: string;
  amount: number;
  term: number;
  baseRate: string;
  spread: number;
  totalRate: number;
  monthlyPayment: number;
}

interface LoanDetailsSectionProps {
  loan1: LoanDetails;
  loan2: LoanDetails;
  onUpdateLoan1: (updates: Partial<LoanDetails>) => void;
  onUpdateLoan2: (updates: Partial<LoanDetails>) => void;
  isReadOnly?: boolean;
}

export default function LoanDetailsSection({
  loan1,
  loan2,
  onUpdateLoan1,
  onUpdateLoan2,
  isReadOnly = false,
}: LoanDetailsSectionProps) {
  const WSJ_PRIME_RATE = 7.25;

  const calculateMonthlyPayment = (amount: number, rate: number, term: number): number => {
    if (amount === 0 || rate === 0 || term === 0) return 0;
    const monthlyRate = rate / 100 / 12;
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) /
                    (Math.pow(1 + monthlyRate, term) - 1);
    return Math.round(payment * 100) / 100;
  };

  const getBaseRateValue = (baseRate: string): number => {
    return baseRate === 'wsj-prime' ? WSJ_PRIME_RATE : 0;
  };

  const handleCalculateLoan1 = () => {
    const payment = calculateMonthlyPayment(loan1.amount, loan1.totalRate, loan1.term);
    onUpdateLoan1({ monthlyPayment: payment });
  };

  const handleCalculateLoan2 = () => {
    const payment = calculateMonthlyPayment(loan2.amount, loan2.totalRate, loan2.term);
    onUpdateLoan2({ monthlyPayment: payment });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Loan 1 Column */}
      <div>
        <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-5 pb-2 border-b-2 border-[var(--t-color-accent)]">
          Loan 1 Details
        </h3>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 1 Type</label>
          <select
            value={loan1.type}
            onChange={(e) => onUpdateLoan1({ type: e.target.value })}
            disabled={isReadOnly}
            className="w-full px-4 py-3 pr-11 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="select-loan1-type"
          >
            <option value="">Select Loan Type</option>
            <option value="conventional">Conventional</option>
            <option value="conventional-sba">Conventional SBA</option>
            <option value="sba-7a-standard">SBA 7(a) Standard</option>
            <option value="sba-504">SBA 504</option>
            <option value="usda-bi">USDA B&I</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 1 Amount</label>
          <input
            type="text"
            value={`$${(loan1.amount || 0).toLocaleString()}`}
            readOnly
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] bg-[#f9fafb] text-[color:var(--t-color-text-secondary)]"
            data-testid="input-loan1-amount"
          />
          <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1.5">Auto-populated from Sources and Uses matrix</p>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 1 Term (months)</label>
          <input
            type="number"
            value={loan1.term || ''}
            onChange={(e) => onUpdateLoan1({ term: parseInt(e.target.value) || 0 })}
            disabled={isReadOnly}
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="input-loan1-term"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 1 Base Rate</label>
          <select
            value={loan1.baseRate}
            onChange={(e) => {
              const newBaseRate = e.target.value;
              onUpdateLoan1({
                baseRate: newBaseRate,
                totalRate: getBaseRateValue(newBaseRate) + loan1.spread
              });
            }}
            disabled={isReadOnly}
            className="w-full px-4 py-3 pr-11 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="select-loan1-base-rate"
          >
            <option value="">Select Base Rate</option>
            <option value="wsj-prime">WSJ Prime (7.25%)</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 1 Spread (%)</label>
          <input
            type="number"
            value={loan1.spread || ''}
            onChange={(e) => onUpdateLoan1({
              spread: parseFloat(e.target.value) || 0,
              totalRate: getBaseRateValue(loan1.baseRate) + (parseFloat(e.target.value) || 0)
            })}
            disabled={isReadOnly}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="input-loan1-spread"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 1 Total Rate (%)</label>
          <input
            type="text"
            value={(loan1.totalRate || 0).toFixed(2)}
            readOnly
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] bg-[#f9fafb] text-[color:var(--t-color-text-secondary)]"
            data-testid="input-loan1-total-rate"
          />
          <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1.5">Calculated: Base Rate + Spread</p>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--t-color-border)]">
          <label className="block text-sm font-semibold text-[color:var(--t-color-text-body)] mb-2">
            Estimated Monthly Payment (P&I)
          </label>
          <input
            type="text"
            value={`$${(loan1.monthlyPayment || 0).toLocaleString()}`}
            readOnly
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-lg font-semibold text-[color:var(--t-color-text-body)] bg-[#f9fafb]"
            data-testid="input-loan1-monthly-payment"
          />
          <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1.5 mb-2">Principal and Interest only</p>
          <button
            type="button"
            onClick={handleCalculateLoan1}
            disabled={isReadOnly}
            className="px-3 py-1.5 bg-[var(--t-color-accent)] text-white text-sm rounded-md cursor-pointer transition-all hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-calculate-loan1"
          >
            Calculate Payment
          </button>
        </div>
      </div>

      {/* Loan 2 Column */}
      <div>
        <h3 className="text-base font-semibold text-[color:var(--t-color-text-body)] mb-5 pb-2 border-b-2 border-[var(--t-color-accent)]">
          Loan 2 Details
        </h3>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 2 Type</label>
          <select
            value={loan2.type}
            onChange={(e) => onUpdateLoan2({ type: e.target.value })}
            disabled={isReadOnly}
            className="w-full px-4 py-3 pr-11 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="select-loan2-type"
          >
            <option value="">Select Loan Type</option>
            <option value="conventional">Conventional</option>
            <option value="conventional-sba">Conventional SBA</option>
            <option value="sba-7a-standard">SBA 7(a) Standard</option>
            <option value="sba-504">SBA 504</option>
            <option value="usda-bi">USDA B&I</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 2 Amount</label>
          <input
            type="text"
            value={`$${(loan2.amount || 0).toLocaleString()}`}
            readOnly
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] bg-[#f9fafb] text-[color:var(--t-color-text-secondary)]"
            data-testid="input-loan2-amount"
          />
          <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1.5">Auto-populated from Sources and Uses matrix</p>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 2 Term (months)</label>
          <input
            type="number"
            value={loan2.term || ''}
            onChange={(e) => onUpdateLoan2({ term: parseInt(e.target.value) || 0 })}
            disabled={isReadOnly}
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="input-loan2-term"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 2 Base Rate</label>
          <select
            value={loan2.baseRate}
            onChange={(e) => {
              const newBaseRate = e.target.value;
              onUpdateLoan2({
                baseRate: newBaseRate,
                totalRate: getBaseRateValue(newBaseRate) + loan2.spread
              });
            }}
            disabled={isReadOnly}
            className="w-full px-4 py-3 pr-11 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2712%27%20height=%278%27%20viewBox=%270%200%2012%208%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201.5L6%206.5L11%201.5%27%20stroke=%27%236b7280%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_16px_center] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="select-loan2-base-rate"
          >
            <option value="">Select Base Rate</option>
            <option value="wsj-prime">WSJ Prime (7.25%)</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 2 Spread (%)</label>
          <input
            type="number"
            value={loan2.spread || ''}
            onChange={(e) => onUpdateLoan2({
              spread: parseFloat(e.target.value) || 0,
              totalRate: getBaseRateValue(loan2.baseRate) + (parseFloat(e.target.value) || 0)
            })}
            disabled={isReadOnly}
            placeholder="0.00"
            step="0.01"
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
            data-testid="input-loan2-spread"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Loan 2 Total Rate (%)</label>
          <input
            type="text"
            value={(loan2.totalRate || 0).toFixed(2)}
            readOnly
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] bg-[#f9fafb] text-[color:var(--t-color-text-secondary)]"
            data-testid="input-loan2-total-rate"
          />
          <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1.5">Calculated: Base Rate + Spread</p>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--t-color-border)]">
          <label className="block text-sm font-semibold text-[color:var(--t-color-text-body)] mb-2">
            Estimated Monthly Payment (P&I)
          </label>
          <input
            type="text"
            value={`$${(loan2.monthlyPayment || 0).toLocaleString()}`}
            readOnly
            className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-lg font-semibold text-[color:var(--t-color-text-body)] bg-[#f9fafb]"
            data-testid="input-loan2-monthly-payment"
          />
          <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1.5 mb-2">Principal and Interest only</p>
          <button
            type="button"
            onClick={handleCalculateLoan2}
            disabled={isReadOnly}
            className="px-3 py-1.5 bg-[var(--t-color-accent)] text-white text-sm rounded-md cursor-pointer transition-all hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-calculate-loan2"
          >
            Calculate Payment
          </button>
        </div>
      </div>
    </div>
  );
}
