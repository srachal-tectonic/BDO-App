'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { SourcesUses } from '@/lib/schema';

// Table type identifier for the three Sources & Uses tables
export type SourcesUsesTableType = '7a' | '504' | 'express';

interface SourcesUsesMatrixProps {
  isReadOnly?: boolean;
  sourcesUses: SourcesUses;
  updateSourcesUses: (updates: Partial<SourcesUses>) => void;
  tableType?: SourcesUsesTableType;
  fourthColumnLabel?: string;
}

export default function SourcesUsesMatrix({
  isReadOnly = false,
  sourcesUses,
  updateSourcesUses,
  tableType = '7a',
  fourthColumnLabel = '3rd Party',
}: SourcesUsesMatrixProps) {
  const [hideEmpty, setHideEmpty] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const formatCurrency = (value: number) => {
    return value === 0 ? '' : value.toLocaleString();
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) || cleaned === '' ? 0 : num;
  };

  const handleFocus = (
    category: keyof SourcesUses,
    source: 'tBankLoan' | 'borrower' | 'sellerNote' | 'thirdParty' | 'sbaTerm'
  ) => {
    const cellKey = `${category}-${source}`;
    setEditingCell(cellKey);
    const categoryData = sourcesUses[category] as Record<string, number> | undefined;
    const currentValue = categoryData?.[source] || 0;
    setEditValue(currentValue === 0 ? '' : currentValue.toString());
  };

  const handleBlur = (
    category: keyof SourcesUses,
    source: 'tBankLoan' | 'borrower' | 'sellerNote' | 'thirdParty' | 'sbaTerm'
  ) => {
    const numValue = parseCurrency(editValue);
    updateSourcesUses({
      [category]: {
        ...(sourcesUses[category] as any),
        [source]: numValue,
      },
    } as any);
    setEditingCell(null);
    setEditValue('');
  };

  const handleChange = (value: string) => {
    // Allow only numbers and common separators
    const cleaned = value.replace(/[^0-9.]/g, '');
    setEditValue(cleaned);
  };

  const getCellValue = (
    category: keyof SourcesUses,
    source: 'tBankLoan' | 'borrower' | 'sellerNote' | 'thirdParty' | 'sbaTerm'
  ) => {
    const cellKey = `${category}-${source}`;
    if (editingCell === cellKey) {
      return editValue;
    }
    const categoryData = sourcesUses[category] as Record<string, number> | undefined;
    // For sbaTerm, don't format as currency - just show the number or empty
    if (source === 'sbaTerm') {
      const value = categoryData?.[source];
      return value ? value.toString() : '';
    }
    return formatCurrency(categoryData?.[source] || 0);
  };

  const getRowTotal = (category: keyof SourcesUses) => {
    const row = sourcesUses[category] as Record<string, number> | undefined;
    if (!row || typeof row === 'number') return 0;
    return (row.tBankLoan || 0) + (row.borrower || 0) + (row.sellerNote || 0) + (row.thirdParty || 0);
  };

  const getColumnTotal = (source: 'tBankLoan' | 'borrower' | 'sellerNote' | 'thirdParty') => {
    return (Object.keys(sourcesUses) as (keyof SourcesUses)[]).reduce<number>((sum, category) => {
      const categoryData = sourcesUses[category] as Record<string, number> | undefined;
      return sum + (categoryData?.[source] || 0);
    }, 0);
  };

  const getGrandTotal = () => {
    return getColumnTotal('tBankLoan') +
      getColumnTotal('borrower') +
      getColumnTotal('sellerNote') +
      getColumnTotal('thirdParty');
  };

  const getRowPercentage = (category: keyof SourcesUses) => {
    const grandTotal = getGrandTotal();
    if (grandTotal === 0) return '0%';
    const rowTotal = getRowTotal(category);
    const percentage = (rowTotal / grandTotal) * 100;
    return percentage.toFixed(1) + '%';
  };

  const rows: { label: string; key: keyof SourcesUses }[] = [
    { label: 'Real Estate Acquisition', key: 'realEstate' },
    { label: 'Debt Refi - CRE', key: 'debtRefiCRE' },
    { label: 'Debt Refi - Non-CRE', key: 'debtRefiNonCRE' },
    { label: 'Machinery & Equipment', key: 'equipment' },
    { label: 'Furniture & Fixtures (TIs)', key: 'furnitureFixtures' },
    { label: 'Inventory', key: 'inventory' },
    { label: 'Business Acquisition', key: 'businessAcquisition' },
    { label: 'Working Capital', key: 'workingCapital' },
    { label: 'Closing Costs', key: 'closingCosts' },
    { label: 'Other', key: 'other' },
  ];

  const visibleRows = hideEmpty ? rows.filter(row => getRowTotal(row.key) > 0) : rows;

  return (
    <div>
      {/* Hide/Show Empty Rows toggle button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setHideEmpty(!hideEmpty)}
          disabled={isReadOnly}
          className="flex items-center gap-2 px-4 py-2 bg-[#f3f4f6] border border-[#d1d5db] rounded-md cursor-pointer text-sm text-[#374151] transition-all hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-toggle-empty-rows"
        >
          {hideEmpty ? <Eye className="w-[18px] h-[18px]" /> : <EyeOff className="w-[18px] h-[18px]" />}
          <span className="whitespace-nowrap">{hideEmpty ? 'Show Empty Rows' : 'Hide Empty Rows'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white border border-[#e5e7eb] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                Use Category
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                T Bank Loan
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                Borrower
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                Seller Note
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                {fourthColumnLabel}
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                Total
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                SBA Term
              </th>
              <th className="bg-[#f9fafb] text-[#374151] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[#e5e7eb]">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key}>
                <td className="px-1 py-1 border-b border-[#e5e7eb] font-medium text-[#1a1a1a] text-sm">
                  {row.label}
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={getCellValue(row.key, 'tBankLoan')}
                    onFocus={() => handleFocus(row.key, 'tBankLoan')}
                    onBlur={() => handleBlur(row.key, 'tBankLoan')}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono focus:outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                    data-testid={`input-${row.key}-tBankLoan`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={getCellValue(row.key, 'borrower')}
                    onFocus={() => handleFocus(row.key, 'borrower')}
                    onBlur={() => handleBlur(row.key, 'borrower')}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono focus:outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                    data-testid={`input-${row.key}-borrower`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={getCellValue(row.key, 'sellerNote')}
                    onFocus={() => handleFocus(row.key, 'sellerNote')}
                    onBlur={() => handleBlur(row.key, 'sellerNote')}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono focus:outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                    data-testid={`input-${row.key}-sellerNote`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={getCellValue(row.key, 'thirdParty')}
                    onFocus={() => handleFocus(row.key, 'thirdParty')}
                    onBlur={() => handleBlur(row.key, 'thirdParty')}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono focus:outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                    data-testid={`input-${row.key}-thirdParty`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={formatCurrency(getRowTotal(row.key))}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#f9fafb] font-semibold text-[#1a1a1a]"
                    data-testid={`total-${row.key}`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={getCellValue(row.key, 'sbaTerm')}
                    onFocus={() => handleFocus(row.key, 'sbaTerm')}
                    onBlur={() => handleBlur(row.key, 'sbaTerm')}
                    onChange={(e) => handleChange(e.target.value)}
                    disabled={isReadOnly}
                    placeholder=""
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono focus:outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[#f3f4f6] disabled:cursor-not-allowed"
                    data-testid={`input-${row.key}-sbaTerm`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[#e5e7eb]">
                  <input
                    type="text"
                    value={getRowPercentage(row.key)}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#eff6ff] font-semibold text-[#2563eb]"
                    data-testid={`percentage-${row.key}`}
                  />
                </td>
              </tr>
            ))}
            {getGrandTotal() > 0 && (
              <tr className="font-semibold">
                <td className="px-1 py-1 font-medium text-[#1a1a1a] text-sm">Total</td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formatCurrency(getColumnTotal('tBankLoan'))}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#f9fafb] font-semibold text-[#1a1a1a]"
                    data-testid="total-tBankLoan"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formatCurrency(getColumnTotal('borrower'))}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#f9fafb] font-semibold text-[#1a1a1a]"
                    data-testid="total-borrower"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formatCurrency(getColumnTotal('sellerNote'))}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#f9fafb] font-semibold text-[#1a1a1a]"
                    data-testid="total-sellerNote"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formatCurrency(getColumnTotal('thirdParty'))}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#f9fafb] font-semibold text-[#1a1a1a]"
                    data-testid="total-thirdParty"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formatCurrency(getGrandTotal())}
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#f9fafb] font-semibold text-[#1a1a1a]"
                    data-testid="total-all"
                  />
                </td>
                <td className="px-1 py-1">
                  {/* SBA Term column - no total */}
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value="100%"
                    readOnly
                    className="w-full px-1 py-1 border border-[#d1d5db] rounded-md text-sm text-right font-mono bg-[#eff6ff] font-semibold text-[#2563eb]"
                    data-testid="total-percentage"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
