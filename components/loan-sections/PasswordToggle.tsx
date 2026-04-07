'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordToggleProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export default function PasswordToggle({
  id,
  value,
  onChange,
  placeholder = '',
  className = '',
  testId,
}: PasswordToggleProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 pr-12 border border-[#d1d5db] rounded-lg text-[15px] transition-all focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] ${className}`}
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b7280] hover:text-[#374151] transition-colors"
        data-testid={`${testId}-toggle`}
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
