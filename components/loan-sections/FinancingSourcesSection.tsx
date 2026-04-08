'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useApplication, FinancingSource } from '@/lib/applicationStore';
import { Button } from '@/components/ui/button';

interface FinancingSourcesSectionProps {
  isReadOnly?: boolean;
}

const MAX_SOURCES = 6;

const FINANCING_TYPE_OPTIONS = [
  'SBA 7(a) Standard',
  'SBA 7(a) Small',
  'SBA Express',
  'SBA 504 CDC',
  'SBA 504 Bank',
  'USDA B&I',
  'Conventional',
  'Seller Note',
  'Equity Injection',
  'Other',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US');
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseInt(cleaned, 10) || 0;
}

export default function FinancingSourcesSection({ isReadOnly = false }: FinancingSourcesSectionProps) {
  const { data, addFinancingSource, removeFinancingSource, updateFinancingSource } = useApplication();
  const sources = data.financingSources || [];

  const handleAdd = () => {
    if (sources.length >= MAX_SOURCES) return;
    const newSource: FinancingSource = {
      id: `fs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      financingType: '',
      guaranteePercent: 0,
      amount: 0,
      rateType: '',
      termYears: 0,
      amortizationMonths: 0,
      baseRate: 0,
      spread: 0,
      totalRate: 0,
    };
    addFinancingSource(newSource);
  };

  const handleUpdate = (id: string, field: keyof FinancingSource, value: string | number) => {
    const updates: Partial<FinancingSource> = { [field]: value };
    if (field === 'baseRate' || field === 'spread') {
      const source = sources.find(s => s.id === id);
      if (source) {
        const base = field === 'baseRate' ? (value as number) : source.baseRate;
        const spr = field === 'spread' ? (value as number) : source.spread;
        updates.totalRate = parseFloat((base + spr).toFixed(2));
      }
    }
    updateFinancingSource(id, updates);
  };

  const inputClass = "w-full px-2 py-1 border border-[#c5d4e8] rounded text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed text-right";
  const selectClass = "w-full px-1 py-1 border border-[#c5d4e8] rounded text-[13px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_2px_rgba(37,99,235,0.1)] cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2710%27%20height=%276%27%20viewBox=%270%200%2010%206%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201L5%205L9%201%27%20stroke=%27%236b7280%27%20stroke-width=%271.5%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_6px_center] pr-5 disabled:bg-[#f3f4f6] disabled:cursor-not-allowed";
  const headerClass = "px-2 py-1.5 text-[11px] font-semibold text-[#133c7f] uppercase tracking-wider whitespace-nowrap";
  const readonlyClass = "w-full px-2 py-1 border border-[#c5d4e8] rounded text-[13px] bg-[#fafbfd] text-[#7da1d4] text-right";

  if (sources.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[13px] text-[#7da1d4] mb-3" data-testid="text-no-financing-sources">
          No financing sources configured yet.
        </p>
        {!isReadOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            data-testid="button-add-first-financing-source"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Financing Source
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" data-testid="table-financing-sources">
          <thead>
            <tr className="border-b border-[#c5d4e8]">
              <th className={headerClass} style={{ minWidth: '150px' }}>Financing Type</th>
              <th className={headerClass} style={{ minWidth: '80px' }}>Gty %</th>
              <th className={headerClass} style={{ minWidth: '120px' }}>Amount</th>
              <th className={headerClass} style={{ minWidth: '100px' }}>Rate Type</th>
              <th className={headerClass} style={{ minWidth: '80px' }}>Term Yrs</th>
              <th className={headerClass} style={{ minWidth: '90px' }}>Amort Mo</th>
              <th className={headerClass} style={{ minWidth: '80px' }}>Base %</th>
              <th className={headerClass} style={{ minWidth: '80px' }}>Spread %</th>
              <th className={headerClass} style={{ minWidth: '80px' }}>Total %</th>
              {!isReadOnly && <th className={headerClass} style={{ width: '40px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {sources.map((source, index) => (
              <tr
                key={source.id}
                className="border-b border-[#c5d4e8] last:border-b-0"
                data-testid={`row-financing-source-${index}`}
              >
                <td className="px-1 py-1">
                  <select
                    value={source.financingType}
                    onChange={(e) => handleUpdate(source.id, 'financingType', e.target.value)}
                    disabled={isReadOnly}
                    className={selectClass}
                    data-testid={`select-financing-type-${index}`}
                  >
                    <option value="">Select Type</option>
                    {FINANCING_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={source.guaranteePercent || ''}
                    onChange={(e) => handleUpdate(source.id, 'guaranteePercent', parseInt(e.target.value) || 0)}
                    disabled={isReadOnly}
                    placeholder="0"
                    min={0}
                    max={100}
                    className={inputClass}
                    data-testid={`input-guarantee-percent-${index}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={source.amount ? `$${formatCurrency(source.amount)}` : ''}
                    onChange={(e) => handleUpdate(source.id, 'amount', parseCurrency(e.target.value))}
                    onFocus={(e) => {
                      e.target.value = source.amount ? source.amount.toString() : '';
                    }}
                    onBlur={(e) => {
                      const val = parseCurrency(e.target.value);
                      handleUpdate(source.id, 'amount', val);
                      e.target.value = val ? `$${formatCurrency(val)}` : '';
                    }}
                    disabled={isReadOnly}
                    placeholder="$0"
                    className={inputClass}
                    data-testid={`input-amount-${index}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <select
                    value={source.rateType}
                    onChange={(e) => handleUpdate(source.id, 'rateType', e.target.value)}
                    disabled={isReadOnly}
                    className={selectClass}
                    data-testid={`select-rate-type-${index}`}
                  >
                    <option value="">Select</option>
                    <option value="variable">Variable</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={source.termYears || ''}
                    onChange={(e) => handleUpdate(source.id, 'termYears', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    placeholder="0.0"
                    step="0.1"
                    min={0}
                    className={inputClass}
                    data-testid={`input-term-years-${index}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={source.amortizationMonths || ''}
                    onChange={(e) => handleUpdate(source.id, 'amortizationMonths', parseInt(e.target.value) || 0)}
                    disabled={isReadOnly}
                    placeholder="0"
                    min={0}
                    className={inputClass}
                    data-testid={`input-amortization-months-${index}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={source.baseRate || ''}
                    onChange={(e) => handleUpdate(source.id, 'baseRate', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    placeholder="0.00"
                    step="0.01"
                    min={0}
                    className={inputClass}
                    data-testid={`input-base-rate-${index}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    value={source.spread || ''}
                    onChange={(e) => handleUpdate(source.id, 'spread', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
                    placeholder="0.00"
                    step="0.01"
                    min={0}
                    className={inputClass}
                    data-testid={`input-spread-${index}`}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={source.totalRate ? source.totalRate.toFixed(2) : ''}
                    readOnly
                    className={readonlyClass}
                    data-testid={`input-total-rate-${index}`}
                  />
                </td>
                {!isReadOnly && (
                  <td className="px-1 py-1 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFinancingSource(source.id)}
                      data-testid={`button-remove-financing-source-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-[#7da1d4]" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isReadOnly && sources.length < MAX_SOURCES && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            data-testid="button-add-financing-source"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Source ({sources.length}/{MAX_SOURCES})
          </Button>
        </div>
      )}
    </div>
  );
}
