'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Address } from '@/lib/schema';

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

// Find the input element within the PlaceAutocompleteElement
// Google stores a reference to the input as a property (name changes between versions)
function findInputInGmpElement(gmpElement: any): HTMLInputElement | null {
  // Google may add inputElement officially in the future
  if (gmpElement.inputElement instanceof HTMLInputElement) {
    return gmpElement.inputElement;
  }

  // No duplicates
  const checkedProps = new Set();

  for (const prop in gmpElement) {
    // Skip if checked or null
    if (checkedProps.has(prop) || !gmpElement[prop]) {
      continue;
    }

    checkedProps.add(prop);

    try {
      const value = gmpElement[prop];
      // Is it an input?
      if (value instanceof HTMLInputElement) {
        return value;
      }
    } catch (e) {
      // Skip if can't be accessed
      continue;
    }
  }

  console.log('[AddressInput] No input element found in PlaceAutocompleteElement');
  return null;
}

// Inject global styles for Google Places Autocomplete element
const injectGooglePlacesStyles = () => {
  const styleId = 'google-places-autocomplete-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Force light color scheme for Google's component */
    gmp-place-autocomplete {
      width: 100% !important;
      display: block !important;
      color-scheme: light only !important;
      --gmp-color-surface: #ffffff !important;
      --gmp-color-on-surface: #1f2937 !important;
      --gmp-color-on-surface-variant: #6b7280 !important;
      --gmp-color-outline: #d1d5db !important;
      --gmp-color-primary: #2563eb !important;
    }

    /* Use ::part() to style shadow DOM elements */
    gmp-place-autocomplete::part(input) {
      background-color: #ffffff !important;
      color: #1f2937 !important;
      font-size: 15px !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      padding: 12px 16px !important;
    }

    gmp-place-autocomplete::part(input):focus {
      border-color: #2563eb !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
      outline: none !important;
    }

    gmp-place-autocomplete::part(input)::placeholder {
      color: #9ca3af !important;
    }

    gmp-place-autocomplete::part(prediction-list) {
      background-color: #ffffff !important;
      border: 1px solid #d1d5db !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
};

interface AddressInputProps {
  value: Address;
  onChange: (address: Address) => void;
  idPrefix: string;
  disabled?: boolean;
}

export default function AddressInput({ value, onChange, idPrefix, disabled = false }: AddressInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Use refs to always have access to current values (avoids stale closures)
  const valueRef = useRef(value);
  valueRef.current = value;

  // Keep onChange ref current to avoid stale closure in event listeners
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Provide safe default if value is undefined
  const safeValue = value || { street1: '', street2: '', city: '', state: '', zipCode: '' };

  // Build display value from address components
  const getDisplayValue = useCallback(() => {
    const parts = [safeValue.street1];
    if (safeValue.city) parts.push(safeValue.city);
    if (safeValue.state) parts.push(safeValue.state);
    if (safeValue.zipCode) parts.push(safeValue.zipCode);
    return parts.filter(Boolean).join(', ');
  }, [safeValue.street1, safeValue.city, safeValue.state, safeValue.zipCode]);

  // Sync input value with external value (for local state)
  useEffect(() => {
    const displayVal = getDisplayValue();
    if (displayVal !== inputValue) {
      setInputValue(displayVal);
    }
  }, [getDisplayValue]);

  // Sync value prop changes to PlaceAutocompleteElement after initialization
  useEffect(() => {
    if (!isInitialized || !autocompleteElementRef.current) return;

    const displayVal = getDisplayValue();
    const inputField = findInputInGmpElement(autocompleteElementRef.current);

    if (inputField && inputField.value !== displayVal) {
      inputField.value = displayVal;
      console.log('[AddressInput] Synced value to PlaceAutocompleteElement:', displayVal);
    }
  }, [value, isInitialized, getDisplayValue]);

  // Initialize Google Places Autocomplete (New API)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    // Inject global styles for Google Places
    injectGooglePlacesStyles();

    if (!apiKey || apiKey === 'your_google_places_api_key_here') {
      console.warn('[AddressInput] Google Places API key not configured');
      setIsFallbackMode(true);
      return;
    }

    const extractAddressComponents = (place: any) => {
      let streetNumber = '', route = '', city = '', state = '', zip = '';

      const components = place.addressComponents || place.address_components || [];

      for (const component of components) {
        const types = component.types || [];
        const longName = component.longText || component.long_name || '';
        const shortName = component.shortText || component.short_name || '';

        if (types.includes('street_number')) {
          streetNumber = shortName;
        }
        if (types.includes('route')) {
          route = longName;
        }
        if (!city) {
          if (types.includes('locality')) {
            city = longName;
          } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
            city = longName;
          } else if (types.includes('neighborhood')) {
            city = longName;
          } else if (types.includes('administrative_area_level_2')) {
            city = longName;
          }
        }
        if (types.includes('administrative_area_level_1')) {
          state = shortName;
        }
        if (types.includes('postal_code')) {
          zip = shortName;
        }
      }

      return { streetNumber, route, city, state, zip };
    };

    const initializeAutocomplete = async () => {
      if (!containerRef.current) return;

      try {
        // Load the places library using the new importLibrary method
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary('places') as any;

        // Create the autocomplete element
        const autocompleteElement = new PlaceAutocompleteElement({
          componentRestrictions: { country: 'us' },
        });

        // Set basic styles and force light mode
        autocompleteElement.style.width = '100%';
        autocompleteElement.style.display = 'block';
        autocompleteElement.style.colorScheme = 'light';
        autocompleteElement.setAttribute('color-scheme', 'light');

        // Clear container and add element
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(autocompleteElement);
        autocompleteElementRef.current = autocompleteElement;

        // Handle place selection using the correct event name: gmp-select
        autocompleteElement.addEventListener('gmp-select', async (event: any) => {
          const placePrediction = event.placePrediction;
          if (!placePrediction) {
            return;
          }

          // Convert prediction to Place and fetch fields
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });

          const { streetNumber, route, city, state, zip } = extractAddressComponents(place);
          const fullStreet = [streetNumber, route].filter(Boolean).join(' ');

          setInputValue(place.formattedAddress || [fullStreet, city, state, zip].filter(Boolean).join(', '));

          const addressToSave = {
            street1: fullStreet,
            street2: valueRef.current?.street2 || '',
            city,
            state,
            zipCode: zip,
          };
          onChangeRef.current(addressToSave);
        });

        // Also listen for input changes for manual typing (dirty detection)
        autocompleteElement.addEventListener('gmp-input', (event: any) => {
          const inputText = event.target?.value || '';

          setInputValue(inputText);

          // Call onChange with partial address data for dirty detection
          const currentValue = valueRef.current || { street1: '', street2: '', city: '', state: '', zipCode: '' };
          const newAddress = {
            street1: inputText.split(',')[0]?.trim() || inputText,
            street2: currentValue.street2 || '',
            city: currentValue.city || '',
            state: currentValue.state || '',
            zipCode: currentValue.zipCode || '',
          };
          onChangeRef.current(newAddress);
        });

        // Set initial value from props after element is ready
        const initialValue = getDisplayValue();
        if (initialValue) {
          // Wait a frame for the element to fully initialize
          requestAnimationFrame(() => {
            const inputField = findInputInGmpElement(autocompleteElement);
            if (inputField) {
              inputField.value = initialValue;
              console.log('[AddressInput] Set initial value:', initialValue);
            }
          });
        }

        setIsInitialized(true);
        console.log('[AddressInput] PlaceAutocompleteElement initialized successfully');
      } catch (error) {
        console.error('[AddressInput] Error initializing autocomplete:', error);
        setIsFallbackMode(true);
      }
    };

    const loadGoogleMaps = () => {
      // Check if already loaded with importLibrary support
      if (window.google?.maps?.importLibrary) {
        initializeAutocomplete();
        return;
      }

      // Check if script exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');

      if (existingScript) {
        let attempts = 0;
        const maxAttempts = 100;
        const pollInterval = setInterval(() => {
          attempts++;
          if (window.google?.maps?.importLibrary) {
            clearInterval(pollInterval);
            initializeAutocomplete();
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            console.error('[AddressInput] Timeout waiting for Google Maps');
            setIsFallbackMode(true);
          }
        }, 100);
        return;
      }

      // Load the script with the new async loading approach
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
      script.async = true;

      script.onload = () => {
        let attempts = 0;
        const pollInterval = setInterval(() => {
          attempts++;
          if (window.google?.maps?.importLibrary) {
            clearInterval(pollInterval);
            initializeAutocomplete();
          } else if (attempts >= 50) {
            clearInterval(pollInterval);
            console.error('[AddressInput] Google Maps loaded but importLibrary not available');
            setIsFallbackMode(true);
          }
        }, 100);
      };

      script.onerror = () => {
        console.error('[AddressInput] Failed to load Google Maps API');
        setIsFallbackMode(true);
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();

    return () => {
      // Remove the autocomplete element
      if (autocompleteElementRef.current) {
        autocompleteElementRef.current.remove();
      }
    };
  }, [idPrefix]);

  // Handle manual input changes for fallback mode
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    const newAddress = {
      street1: newValue.split(',')[0]?.trim() || newValue,
      street2: safeValue.street2 || '',
      city: safeValue.city || '',
      state: safeValue.state || '',
      zipCode: safeValue.zipCode || '',
    };

    onChangeRef.current(newAddress);
  };

  // Render fallback input if Google Maps fails to load
  if (isFallbackMode) {
    return (
      <div className="relative w-full">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter street address"
          disabled={disabled}
          className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] bg-white text-gray-900 transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
          data-testid={`input-${idPrefix}-street`}
          autoComplete="street-address"
        />
      </div>
    );
  }

  // Container for Google Places autocomplete element
  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ colorScheme: 'light' }}
      data-testid={`container-${idPrefix}-address`}
    >
      {/* Placeholder while loading */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Enter street address"
        disabled={disabled}
        className="w-full px-4 py-3 border border-[var(--t-color-border)] rounded-lg text-[15px] bg-white text-gray-900 transition-all focus:border-[var(--t-color-accent)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] focus:outline-none disabled:bg-[var(--t-color-input-bg)] disabled:cursor-not-allowed"
        data-testid={`input-${idPrefix}-street`}
        autoComplete="off"
      />
    </div>
  );
}
