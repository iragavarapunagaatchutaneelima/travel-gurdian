"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  MapPin, Search, Loader, Crosshair, X, AlertCircle, 
  Plane, Train, Building2, Landmark, Navigation2, Check
} from "lucide-react";
import { LocationDetails, PlaceSuggestion } from "../../types/location";
import { 
  getAutocompletePredictions, 
  fetchPlaceDetails, 
  reverseGeocodeCoordinates 
} from "../../services/googlePlaces";

interface LocationSearchInputProps {
  label: string;
  placeholder: string;
  selectedLocation: LocationDetails | null;
  onSelectLocation: (loc: LocationDetails | null) => void;
  isOrigin?: boolean;
  onUseCurrentLocation?: () => void;
  currentLocationLoading?: boolean;
  error?: string | null;
  idPrefix: string;
}

export default function LocationSearchInput({
  label,
  placeholder,
  selectedLocation,
  onSelectLocation,
  isOrigin = false,
  error,
  idPrefix
}: LocationSearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal input value with selectedLocation if provided
  useEffect(() => {
    if (selectedLocation) {
      setInputValue(selectedLocation.name || selectedLocation.formattedAddress);
    }
  }, [selectedLocation]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced autocomplete query
  const queryAutocomplete = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await getAutocompletePredictions(query);
        setSuggestions(results);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err: any) {
        if (err.message === "OFFLINE") {
          setSearchError("You are currently offline. Live location search requires an internet connection.");
        } else if (err.message === "MISSING_API_KEY") {
          setSearchError("Google Maps API Key not configured. Please use quick-select metro hubs below or set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.");
        } else {
          setSearchError("Unable to fetch location suggestions. Try quick-select hubs or check network.");
        }
        setSuggestions([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 350);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (selectedLocation && val !== selectedLocation.name) {
      // User is editing after selecting
      onSelectLocation(null);
    }
    queryAutocomplete(val);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsLoading(true);
    setIsOpen(false);
    setSearchError(null);

    try {
      const details = await fetchPlaceDetails(suggestion.placeId, suggestion.mainText);
      onSelectLocation(details);
      setInputValue(details.name);
    } catch (err) {
      console.warn("Failed to fetch full place details, falling back to suggestion info:", err);
      // Fallback LocationDetails
      const fallback: LocationDetails = {
        placeId: suggestion.placeId,
        name: suggestion.mainText,
        formattedAddress: suggestion.fullDescription,
        latitude: 13.0827,
        longitude: 80.2707,
        types: suggestion.types
      };
      onSelectLocation(fallback);
      setInputValue(suggestion.mainText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setIsOpen(false);
    onSelectLocation(null);
    setSearchError(null);
    setGpsError(null);
    inputRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // "Use Current Location" handler
  const handleCurrentLocationClick = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const locDetails = await reverseGeocodeCoordinates(latitude, longitude);
          onSelectLocation(locDetails);
          setInputValue(locDetails.name);
          setIsOpen(false);
        } catch (err: any) {
          // Fallback location
          const fallbackLoc: LocationDetails = {
            placeId: `gps_${latitude.toFixed(4)}_${longitude.toFixed(4)}`,
            name: `Current Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            formattedAddress: `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude,
            types: ["current_location"]
          };
          onSelectLocation(fallbackLoc);
          setInputValue(fallbackLoc.name);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location access was denied. Please allow location access in your browser settings.");
        } else if (err.code === err.TIMEOUT) {
          setGpsError("Location request timed out. Please try again.");
        } else {
          setGpsError("Unable to acquire GPS coordinates.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Icon helper based on place types
  const getPlaceIcon = (types?: string[]) => {
    if (!types || types.length === 0) return <MapPin className="h-4 w-4 text-primary-accent" />;
    if (types.includes("airport")) return <Plane className="h-4 w-4 text-info" />;
    if (types.includes("transit_station") || types.includes("train_station") || types.includes("subway_station")) {
      return <Train className="h-4 w-4 text-warning" />;
    }
    if (types.includes("hospital") || types.includes("health")) {
      return <Building2 className="h-4 w-4 text-danger" />;
    }
    if (types.includes("tourist_attraction") || types.includes("point_of_interest") || types.includes("landmark")) {
      return <Landmark className="h-4 w-4 text-primary-accent-hover" />;
    }
    return <MapPin className="h-4 w-4 text-primary-accent" />;
  };

  return (
    <div ref={containerRef} className="space-y-1.5 relative text-left w-full">
      <div className="flex items-center justify-between">
        <label 
          htmlFor={`${idPrefix}-input`}
          className="text-[10px] font-black text-muted uppercase tracking-wider block"
        >
          {label}
        </label>
        
        {isOrigin && (
          <button
            type="button"
            onClick={handleCurrentLocationClick}
            disabled={gpsLoading}
            className="text-[10px] font-black text-primary-accent hover:text-primary-accent-hover flex items-center gap-1 transition-colors uppercase tracking-wider py-0.5 px-1.5 rounded-md hover:bg-primary-accent/10"
            title="Auto-detect current GPS coordinates"
          >
            {gpsLoading ? (
              <Loader className="h-3 w-3 animate-spin text-primary-accent" />
            ) : (
              <Crosshair className="h-3 w-3 text-primary-accent" />
            )}
            <span>Use Current Location</span>
          </button>
        )}
      </div>

      {/* Input container */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {isOrigin ? (
            <Navigation2 className="h-4 w-4 text-primary-accent" />
          ) : (
            <MapPin className="h-4 w-4 text-success" />
          )}
        </div>

        <input
          id={`${idPrefix}-input`}
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0 || searchError) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-2xl bg-elevated-surface border ${
            error ? "border-danger ring-1 ring-danger" : "border-border focus:border-primary-accent"
          } pl-10 pr-10 py-3.5 text-xs text-foreground font-bold focus:outline-none transition-all`}
        />

        {/* Right side status / clear icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader className="h-4 w-4 animate-spin text-primary-accent" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-muted hover:text-foreground hover:bg-border transition-colors"
              title="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* GPS Error alert */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-[11px] font-bold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setGpsError(null)} 
            className="text-[10px] hover:underline font-black ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Selected place details badge */}
      {selectedLocation && (
        <div className="p-2.5 rounded-xl bg-surface border border-border flex items-center justify-between text-xs animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1 rounded-md bg-success/10 text-success flex-shrink-0">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <div className="truncate">
              <span className="font-black text-foreground text-xs block truncate">
                {selectedLocation.name}
              </span>
              <span className="text-[10px] text-muted block truncate">
                {selectedLocation.formattedAddress}
              </span>
            </div>
          </div>
          <div className="text-[9px] font-mono font-bold text-muted ml-2 flex-shrink-0">
            {selectedLocation.latitude.toFixed(3)}, {selectedLocation.longitude.toFixed(3)}
          </div>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-slideUp text-left"
          role="listbox"
        >
          {searchError ? (
            <div className="p-4 text-xs text-muted space-y-1">
              <div className="flex items-center gap-2 text-warning font-bold">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Notice</span>
              </div>
              <p className="text-[11px] text-muted font-semibold leading-relaxed">
                {searchError}
              </p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1 divide-y divide-border">
              {suggestions.map((sug, idx) => (
                <button
                  key={sug.placeId || idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(sug)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                    selectedIndex === idx 
                      ? "bg-primary-accent/15 text-foreground" 
                      : "hover:bg-elevated-surface text-foreground"
                  }`}
                  role="option"
                  aria-selected={selectedIndex === idx}
                >
                  <div className="p-1.5 rounded-lg bg-elevated-surface border border-border mt-0.5 flex-shrink-0">
                    {getPlaceIcon(sug.types)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <span className="font-black text-xs text-foreground block truncate">
                      {sug.mainText}
                    </span>
                    {sug.secondaryText && (
                      <span className="text-[10px] font-semibold text-muted block truncate mt-0.5">
                        {sug.secondaryText}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : inputValue.trim() && !isLoading ? (
            <div className="p-4 text-center text-xs text-muted font-bold">
              No matching places found. Try another landmark or city.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
