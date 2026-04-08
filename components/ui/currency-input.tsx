'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value?: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  showDecimals?: boolean;
  className?: string;
  disabled?: boolean;
  'data-testid'?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  showDecimals = false,
  className,
  disabled = false,
  'data-testid': testId,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number with commas
  const formatNumber = (num: string | number): string => {
    if (num === '' || num === undefined || num === null) return '';

    const numStr = String(num).replace(/[^0-9.-]/g, '');
    if (numStr === '' || numStr === '-') return numStr;

    const parts = numStr.split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    // Format integer part with commas
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (showDecimals && decPart !== undefined) {
      return `${formattedInt}.${decPart.slice(0, 2)}`;
    }

    return formattedInt;
  };

  // Parse formatted string back to raw number
  const parseNumber = (formatted: string): string => {
    return formatted.replace(/[^0-9.-]/g, '');
  };

  // Update display when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value, showDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const parsed = parseNumber(rawValue);

    // Allow empty, negative sign, or valid numbers
    if (parsed === '' || parsed === '-' || !isNaN(Number(parsed))) {
      setDisplayValue(formatNumber(parsed));
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    // Clean up on blur
    if (displayValue) {
      const parsed = parseNumber(displayValue);
      if (parsed && !isNaN(Number(parsed))) {
        setDisplayValue(formatNumber(parsed));
      }
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--t-color-text-secondary)] pointer-events-none">
        $
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full pl-8 pr-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] transition-all',
          'focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none',
          disabled && 'bg-[#f9fafb] text-[color:var(--t-color-text-secondary)] cursor-not-allowed',
          className
        )}
        data-testid={testId}
      />
    </div>
  );
}
