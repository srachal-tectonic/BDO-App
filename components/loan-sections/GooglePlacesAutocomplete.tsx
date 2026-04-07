'use client';

import { useEffect, useRef, useState } from 'react';

interface GooglePlacesAutocompleteProps {
  value?: string;
  onChange: (address: string, placeDetails?: any) => void;
  placeholder?: string;
  id?: string;
  testId?: string;
}

declare global {
  interface Window {
    google: any;
  }
  const google: any;
}

export default function GooglePlacesAutocomplete({
  value = '',
  onChange,
  placeholder = 'Enter address',
  id,
  testId
}: GooglePlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!apiKey || apiKey === 'your_google_places_api_key_here') {
      console.warn('Google Places API key not configured. Please add NEXT_PUBLIC_GOOGLE_PLACES_API_KEY to .env.local');
      return;
    }

    const initializePlaces = async () => {
      // Check if Google Maps is available
      if (typeof window === 'undefined' || !window.google?.maps?.importLibrary) {
        return false;
      }

      try {
        // Import the new Places library
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places") as any;

        // Create the autocomplete element
        const pac = new PlaceAutocompleteElement({
          componentRestrictions: { country: 'us' },
        }) as any;

        autocompleteRef.current = pac;

        // Style the element to match existing inputs
        pac.style.width = '100%';
        pac.style.border = '1px solid #d1d5db';
        pac.style.borderRadius = '8px';
        pac.style.padding = '12px 16px';
        pac.style.fontSize = '15px';
        pac.style.backgroundColor = '#ffffff';
        pac.style.colorScheme = 'light';

        // Set placeholder
        pac.setAttribute('placeholder', placeholder);

        // Set id if provided
        if (id) {
          pac.setAttribute('id', id);
        }

        // Set test id if provided
        if (testId) {
          pac.setAttribute('data-testid', testId);
        }

        // Clear container and append the element
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(pac);
        }

        // Add event listener for place selection
        pac.addEventListener('gmp-placeselect', async (event: any) => {
          const place = event.place;

          // Fetch additional fields if not already loaded
          if (!place.address_components || !place.formatted_address) {
            await place.fetchFields({
              fields: ['address_components', 'formatted_address', 'geometry', 'place_id']
            });
          }

          // Get the formatted address
          const formattedAddress = place.formatted_address || '';

          // Parse address components for additional details
          const addressDetails: any = {
            formatted_address: formattedAddress,
            place_id: place.place_id,
            geometry: place.geometry,
            address_components: {}
          };

          // Extract common address components
          if (place.address_components) {
            for (const component of place.address_components) {
              const types = component.types || [];

              if (types.includes("street_number")) {
                addressDetails.address_components.street_number = component.short_name || "";
              }
              if (types.includes("route")) {
                addressDetails.address_components.route = component.long_name || "";
              }
              if (types.includes("locality")) {
                addressDetails.address_components.city = component.long_name || "";
              }
              if (types.includes("administrative_area_level_1")) {
                addressDetails.address_components.state = component.short_name || "";
              }
              if (types.includes("postal_code")) {
                addressDetails.address_components.zipCode = component.short_name || "";
              }
              if (types.includes("country")) {
                addressDetails.address_components.country = component.long_name || "";
              }
            }

            // Create full street address
            const streetNumber = addressDetails.address_components.street_number || "";
            const route = addressDetails.address_components.route || "";
            addressDetails.address_components.street1 = [streetNumber, route].filter(Boolean).join(" ");
          }

          // Call onChange with formatted address and details
          onChange(formattedAddress, addressDetails);
        });

        setIsInitialized(true);
        return true;
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        return false;
      }
    };

    // Check if script is already loaded
    const checkAndInit = async () => {
      if (window.google?.maps?.importLibrary) {
        await initializePlaces();
        return;
      }

      // Check if script exists in DOM
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');

      if (existingScript) {
        // Script exists, wait for it to load
        let attempts = 0;
        const maxAttempts = 50;
        const pollInterval = setInterval(async () => {
          attempts++;
          const success = await initializePlaces();
          if (success || attempts >= maxAttempts) {
            clearInterval(pollInterval);
          }
        }, 200);

        return () => clearInterval(pollInterval);
      } else {
        // Load the script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          // Wait a bit for the library to be fully ready
          setTimeout(async () => {
            await initializePlaces();
          }, 100);
        };

        script.onerror = () => {
          console.error('Failed to load Google Maps API');
        };

        document.head.appendChild(script);
      }
    };

    checkAndInit();

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        try {
          autocompleteRef.current.remove();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [placeholder, id, testId, onChange]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      data-initialized={isInitialized}
    />
  );
}
