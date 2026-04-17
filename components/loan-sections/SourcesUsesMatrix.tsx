'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { SourcesUses } from '@/lib/schema';

// Table type identifier for the three Sources & Uses tables
export type SourcesUsesTableType = '7a' | '504' | 'express';

// Column definition
export interface SourceColumn {
  key: string;
  label: string;
}

// Default columns when no dynamic columns are provided
const DEFAULT_SOURCE_COLUMNS: SourceColumn[] = [
  { key: 'tBankLoan', label: 'SBA 7(a) Standard' },
  { key: 'sba504', label: 'SBA 504' },
  { key: 'cdcDebenture', label: 'CDC Debenture' },
  { key: 'sellerNote', label: 'Seller Note' },
  { key: 'thirdParty', label: '3rd Party' },
  { key: 'equity', label: 'Equity' },
];

interface SourcesUsesMatrixProps {
  isReadOnly?: boolean;
  sourcesUses: SourcesUses;
  updateSourcesUses: (updates: Partial<SourcesUses>) => void;
  tableType?: SourcesUsesTableType;
  columns?: SourceColumn[];
}

export default function SourcesUsesMatrix({
  isReadOnly = false,
  sourcesUses,
  updateSourcesUses,
  tableType = '7a',
  columns,
}: SourcesUsesMatrixProps) {
  const [hideEmpty, setHideEmpty] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const sourceColumns = columns || DEFAULT_SOURCE_COLUMNS;

  const formatCurrency = (value: number) => {
    return value === 0 ? '' : value.toLocaleString();
  };

  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) || cleaned === '' ? 0 : num;
  };

  const handleFocus = (category: string, source: string) => {
    const cellKey = `${category}-${source}`;
    setEditingCell(cellKey);
    const categoryData = (sourcesUses as any)[category] as Record<string, number> | undefined;
    const currentValue = categoryData?.[source] || 0;
    setEditValue(currentValue === 0 ? '' : currentValue.toString());
  };

  const handleBlur = (category: string, source: string) => {
    const numValue = parseCurrency(editValue);
    updateSourcesUses({
      [category]: {
        ...((sourcesUses as any)[category] as any),
        [source]: numValue,
      },
    } as any);
    setEditingCell(null);
    setEditValue('');
  };

  const handleChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setEditValue(cleaned);
  };

  const getCellValue = (category: string, source: string) => {
    const cellKey = `${category}-${source}`;
    if (editingCell === cellKey) {
      return editValue;
    }
    const categoryData = (sourcesUses as any)[category] as Record<string, number> | undefined;
    return formatCurrency(categoryData?.[source] || 0);
  };

  const getRowTotal = (category: string) => {
    const row = (sourcesUses as any)[category] as Record<string, number> | undefined;
    if (!row || typeof row === 'number') return 0;
    return sourceColumns.reduce((sum, col) => sum + (row[col.key] || 0), 0);
  };

  const getColumnTotal = (source: string) => {
    return rows.reduce((sum, row) => {
      const categoryData = (sourcesUses as any)[row.key] as Record<string, number> | undefined;
      return sum + (categoryData?.[source] || 0);
    }, 0);
  };

  const getGrandTotal = () => {
    return sourceColumns.reduce((sum, col) => sum + getColumnTotal(col.key), 0);
  };

  const getRowPercentage = (category: string) => {
    const grandTotal = getGrandTotal();
    if (grandTotal === 0) return '0%';
    const rowTotal = getRowTotal(category);
    const percentage = (rowTotal / grandTotal) * 100;
    return percentage.toFixed(1) + '%';
  };

  const rows = [
    { label: 'Real Estate Acquisition', key: 'realEstate' },
    { label: 'Debt Refi - CRE', key: 'debtRefiCRE' },
    { label: 'Debt Refi - Non-CRE', key: 'debtRefiNonCRE' },
    { label: 'Machinery & Equipment', key: 'equipment' },
    { label: 'Furniture & Fixtures (TIs)', key: 'furnitureFixtures' },
    { label: 'Inventory', key: 'inventory' },
    { label: 'Business Acquisition', key: 'businessAcquisition' },
    { label: 'Working Capital', key: 'workingCapital' },
    { label: 'Working Capital - Pre Opening', key: 'workingCapitalPreOpening' },
    { label: 'Franchise Fees', key: 'franchiseFees' },
    { label: 'Construction Hard Costs', key: 'constructionHardCosts' },
    { label: 'Interim Interest Reserve', key: 'interimInterestReserve' },
    { label: 'Construction Contingency', key: 'constructionContingency' },
    { label: 'Other Construction Soft Costs', key: 'otherConstructionSoftCosts' },
    { label: 'Closing Costs', key: 'closingCosts' },
    { label: 'SBA Gty Fee', key: 'sbaGtyFee' },
    { label: 'Other', key: 'other' },
  ];

  const visibleRows = hideEmpty ? rows.filter(row => getRowTotal(row.key) > 0) : rows;

  const headerClass = "bg-[var(--t-color-page-bg)] text-[color:var(--t-color-text-body)] font-semibold text-sm text-left px-4 py-3 border-b-2 border-[var(--t-color-border)]";
  const cellInputClass = "w-full px-1 py-1 border border-[var(--t-color-border)] rounded-md text-sm text-right font-mono focus:outline-none focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed";
  const readonlyInputClass = "w-full px-1 py-1 border border-[var(--t-color-border)] rounded-md text-sm text-right font-mono bg-[var(--t-color-page-bg)] font-semibold text-[color:var(--t-color-text-body)]";

  return (
    <div>
      {/* Hide/Show Empty Rows toggle button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setHideEmpty(!hideEmpty)}
          disabled={isReadOnly}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--t-color-input-bg)] border border-[var(--t-color-border)] rounded-md cursor-pointer text-sm text-[color:var(--t-color-text-body)] transition-all hover-elevate disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-toggle-empty-rows"
        >
          {hideEmpty ? <Eye className="w-[18px] h-[18px]" /> : <EyeOff className="w-[18px] h-[18px]" />}
          <span className="whitespace-nowrap">{hideEmpty ? 'Show Empty Rows' : 'Hide Empty Rows'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-lg overflow-hidden">
          <thead>
            <tr>
              <th className={headerClass}>Use Category</th>
              {sourceColumns.map(col => (
                <th key={col.key} className={headerClass}>{col.label}</th>
              ))}
              <th className={headerClass}>Total</th>
              <th className={headerClass}>%</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key}>
                <td className="px-1 py-1 border-b border-[var(--t-color-border)] font-medium text-[color:var(--t-color-text-body)] text-sm">
                  {row.label}
                </td>
                {sourceColumns.map(col => (
                  <td key={col.key} className="px-1 py-1 border-b border-[var(--t-color-border)]">
                    <input
                      type="text"
                      value={getCellValue(row.key, col.key)}
                      onFocus={() => handleFocus(row.key, col.key)}
                      onBlur={() => handleBlur(row.key, col.key)}
                      onChange={(e) => handleChange(e.target.value)}
                      disabled={isReadOnly}
                      className={cellInputClass}
                      data-testid={`input-${row.key}-${col.key}`}
                    />
                  </td>
                ))}
                <td className="px-1 py-1 border-b border-[var(--t-color-border)]">
                  <input
                    type="text"
                    value={formatCurrency(getRowTotal(row.key))}
                    readOnly
                    className={readonlyInputClass}
                    data-testid={`total-${row.key}`}
                  />
                </td>
                <td className="px-1 py-1 border-b border-[var(--t-color-border)]">
                  <input
                    type="text"
                    value={getRowPercentage(row.key)}
                    readOnly
                    className="w-full px-1 py-1 border border-[var(--t-color-border)] rounded-md text-sm text-right font-mono bg-[var(--t-color-info-bg)] font-semibold text-[color:var(--t-color-accent)]"
                    data-testid={`percentage-${row.key}`}
                  />
                </td>
              </tr>
            ))}
            {getGrandTotal() > 0 && (
              <tr className="font-semibold">
                <td className="px-1 py-1 font-medium text-[color:var(--t-color-text-body)] text-sm">Total</td>
                {sourceColumns.map(col => (
                  <td key={col.key} className="px-1 py-1">
                    <input
                      type="text"
                      value={formatCurrency(getColumnTotal(col.key))}
                      readOnly
                      className={readonlyInputClass}
                      data-testid={`total-${col.key}`}
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value={formatCurrency(getGrandTotal())}
                    readOnly
                    className={readonlyInputClass}
                    data-testid="total-all"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    value="100%"
                    readOnly
                    className="w-full px-1 py-1 border border-[var(--t-color-border)] rounded-md text-sm text-right font-mono bg-[var(--t-color-info-bg)] font-semibold text-[color:var(--t-color-accent)]"
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
