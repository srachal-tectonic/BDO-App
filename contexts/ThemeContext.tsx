'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface ThemeSettings {
  fontFamily: string;
  fontSizeBase: string;
  fontSizeSmall: string;
  fontSizeLarge: string;
  fontSizeHeading: string;
  fontSizeSectionHeader: string;
  borderRadius: string;
  sectionPaddingX: string;
  sectionPaddingY: string;
  sectionMarginBottom: string;
  fieldSpacing: string;
  inputPaddingX: string;
  inputPaddingY: string;
  colorPrimary: string;
  colorPrimaryLight: string;
  colorPrimaryLighter: string;
  colorPrimaryPale: string;
  colorPrimaryPalest: string;
  colorAccent: string;
  colorPageBg: string;
  colorCardBg: string;
  colorInputBg: string;
  colorHighlightBg: string;
  colorHighlightBorder: string;
  colorBorder: string;
  colorDisabled: string;
  colorTextPrimary: string;
  colorTextBody: string;
  colorTextSecondary: string;
  colorTextMuted: string;
  colorSuccess: string;
  colorSuccessLight: string;
  colorSuccessBg: string;
  colorSuccessText: string;
  colorSuccessBorder: string;
  colorWarning: string;
  colorWarningLight: string;
  colorWarningBg: string;
  colorWarningText: string;
  colorDanger: string;
  colorDangerLight: string;
  colorDangerBg: string;
  colorDangerText: string;
  colorInfoBg: string;
  colorInfoBorder: string;
  colorInfoText: string;
  colorPurple: string;
  colorOrange: string;
}

export const defaultTheme: ThemeSettings = {
  fontFamily: 'Poppins',
  fontSizeBase: '13px',
  fontSizeSmall: '11px',
  fontSizeLarge: '15px',
  fontSizeHeading: '1.125rem',
  fontSizeSectionHeader: '0.8rem',
  borderRadius: '0.375rem',
  sectionPaddingX: '1rem',
  sectionPaddingY: '0.75rem',
  sectionMarginBottom: '0.75rem',
  fieldSpacing: '0.5rem',
  inputPaddingX: '0.75rem',
  inputPaddingY: '0.375rem',
  colorPrimary: '#133c7f',
  colorPrimaryLight: '#4263a5',
  colorPrimaryLighter: '#718bbc',
  colorPrimaryPale: '#a1b3d2',
  colorPrimaryPalest: '#e7edf4',
  colorAccent: '#2563eb',
  colorPageBg: '#fafbfd',
  colorCardBg: '#ffffff',
  colorInputBg: '#f3f4f6',
  colorHighlightBg: '#f0f4ff',
  colorHighlightBorder: '#e2e8f0',
  colorBorder: '#c5d4e8',
  colorDisabled: '#cbd5e1',
  colorTextPrimary: '#133c7f',
  colorTextBody: '#1a1a1a',
  colorTextSecondary: '#4a6fa5',
  colorTextMuted: '#7da1d4',
  colorSuccess: '#059669',
  colorSuccessLight: '#10b981',
  colorSuccessBg: '#ecfdf5',
  colorSuccessText: '#166534',
  colorSuccessBorder: '#22c55e',
  colorWarning: '#d97706',
  colorWarningLight: '#f59e0b',
  colorWarningBg: '#fef3c7',
  colorWarningText: '#92400e',
  colorDanger: '#e63b2e',
  colorDangerLight: '#ef4444',
  colorDangerBg: '#fef2f2',
  colorDangerText: '#dc2626',
  colorInfoBg: '#eff6ff',
  colorInfoBorder: '#bfdbfe',
  colorInfoText: '#0369a1',
  colorPurple: '#8b5cf6',
  colorOrange: '#f97316',
};

const STORAGE_KEY = 'app-theme-settings';

// Maps ThemeSettings keys to their CSS custom property names
const themeKeyToCssVar: Record<keyof ThemeSettings, string> = {
  fontFamily: '--t-font-family',
  fontSizeBase: '--t-font-size-base',
  fontSizeSmall: '--t-font-size-sm',
  fontSizeLarge: '--t-font-size-lg',
  fontSizeHeading: '--t-font-size-heading',
  fontSizeSectionHeader: '--t-font-size-section-header',
  borderRadius: '--t-border-radius',
  sectionPaddingX: '--t-section-px',
  sectionPaddingY: '--t-section-py',
  sectionMarginBottom: '--t-section-mb',
  fieldSpacing: '--t-field-spacing',
  inputPaddingX: '--t-input-px',
  inputPaddingY: '--t-input-py',
  colorPrimary: '--t-color-primary',
  colorPrimaryLight: '--t-color-primary-light',
  colorPrimaryLighter: '--t-color-primary-lighter',
  colorPrimaryPale: '--t-color-primary-pale',
  colorPrimaryPalest: '--t-color-primary-palest',
  colorAccent: '--t-color-accent',
  colorPageBg: '--t-color-page-bg',
  colorCardBg: '--t-color-card-bg',
  colorInputBg: '--t-color-input-bg',
  colorHighlightBg: '--t-color-highlight-bg',
  colorHighlightBorder: '--t-color-highlight-border',
  colorBorder: '--t-color-border',
  colorDisabled: '--t-color-disabled',
  colorTextPrimary: '--t-color-text-primary',
  colorTextBody: '--t-color-text-body',
  colorTextSecondary: '--t-color-text-secondary',
  colorTextMuted: '--t-color-text-muted',
  colorSuccess: '--t-color-success',
  colorSuccessLight: '--t-color-success-light',
  colorSuccessBg: '--t-color-success-bg',
  colorSuccessText: '--t-color-success-text',
  colorSuccessBorder: '--t-color-success-border',
  colorWarning: '--t-color-warning',
  colorWarningLight: '--t-color-warning-light',
  colorWarningBg: '--t-color-warning-bg',
  colorWarningText: '--t-color-warning-text',
  colorDanger: '--t-color-danger',
  colorDangerLight: '--t-color-danger-light',
  colorDangerBg: '--t-color-danger-bg',
  colorDangerText: '--t-color-danger-text',
  colorInfoBg: '--t-color-info-bg',
  colorInfoBorder: '--t-color-info-border',
  colorInfoText: '--t-color-info-text',
  colorPurple: '--t-color-purple',
  colorOrange: '--t-color-orange',
};

function applyThemeToDOM(theme: ThemeSettings) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(themeKeyToCssVar)) {
    let value = theme[key as keyof ThemeSettings];
    if (key === 'fontFamily') {
      // Use the next/font CSS variable for Poppins so the optimized font-face is used
      value = value === 'Poppins'
        ? `var(--font-poppins), sans-serif`
        : `'${value}', sans-serif`;
    }
    root.style.setProperty(cssVar, value);
  }
}

interface ThemeContextValue {
  themeSettings: ThemeSettings;
  setThemeSettings: (settings: ThemeSettings) => void;
  saveTheme: () => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  // Load saved theme from localStorage on mount and apply it
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultTheme, ...parsed };
        setThemeSettings(merged);
        applyThemeToDOM(merged);
      } else {
        applyThemeToDOM(defaultTheme);
      }
    } catch {
      applyThemeToDOM(defaultTheme);
    }
    setMounted(true);
  }, []);

  // Re-apply CSS variables whenever themeSettings change (after initial mount)
  useEffect(() => {
    if (mounted) {
      applyThemeToDOM(themeSettings);
    }
  }, [themeSettings, mounted]);

  const saveTheme = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themeSettings));
    applyThemeToDOM(themeSettings);
  }, [themeSettings]);

  const resetTheme = useCallback(() => {
    setThemeSettings(defaultTheme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTheme));
    applyThemeToDOM(defaultTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeSettings, setThemeSettings, saveTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
