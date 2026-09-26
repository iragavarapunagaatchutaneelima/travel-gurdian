"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  MapPin, Loader, Crosshair, X, AlertCircle, 
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
      // Never silently substitute a fake location (e.g. a hardcoded city's
      // coordinates) for a place whose real coordinates could not be
      // resolved -- that would route the user somewhere they never chose.
      console.warn("Failed to fetch place details:", err);
      onSelectLocation(null);
      setSearchError("Could not resolve the exact location for that place. Please try selecting it again or choose a different result.");
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
        } catch {
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
    <div ref={containerRef} className="space-y-1.5 relative text-left w-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={`${idPrefix}-input`}
          style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {label}
        </label>

        {isOrigin && (
          <button
            type="button"
            onClick={handleCurrentLocationClick}
            disabled={gpsLoading}
            className="flex items-center gap-1 transition-all rounded-lg px-2 py-1"
            style={{ fontSize: "11px", fontWeight: 600, color: "#2563FF", backgroundColor: "#EFF6FF" }}
            title="Auto-detect current GPS coordinates"
          >
            {gpsLoading ? (
              <Loader className="h-3 w-3 animate-spin" style={{ color: "#2563FF" }} />
            ) : (
              <Crosshair className="h-3 w-3" style={{ color: "#2563FF" }} />
            )}
            <span>Use My Location</span>
          </button>
        )}
      </div>

      {/* Input container */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {isOrigin ? (
            <Navigation2 className="h-4 w-4" style={{ color: "var(--primary)" }} />
          ) : (
            <MapPin className="h-4 w-4" style={{ color: "var(--success)" }} />
          )}
        </div>

        <input
          id={`${idPrefix}-input`}
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={(e) => {
            if (suggestions.length > 0 || searchError) setIsOpen(true);
            (e.currentTarget as HTMLElement).style.borderColor = "var(--primary)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(37,99,255,0.15)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = error ? "var(--danger)" : "var(--border)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          style={{
            width: "100%",
            backgroundColor: "var(--elevated-surface)",
            border: `1.5px solid ${error ? "var(--danger)" : "var(--border)"}`,
            borderRadius: "14px",
            paddingLeft: "40px",
            paddingRight: "40px",
            paddingTop: "13px",
            paddingBottom: "13px",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--foreground)",
            fontFamily: "'Poppins', sans-serif",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />

        {/* Right side status / clear icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader className="h-4 w-4 animate-spin text-(--primary)" />
          )}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-(--muted-foreground) hover:bg-surface hover:text-foreground transition-colors"
              title="Clear input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* GPS Error alert */}
      {gpsError && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button type="button" onClick={() => setGpsError(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Selected place badge */}
      {selectedLocation && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 animate-fadeIn">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1 rounded-lg shrink-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
            </div>
            <div className="truncate">
              <span className="block truncate text-xs font-bold text-foreground">{selectedLocation.name}</span>
              <span className="block truncate text-[11px] text-(--muted-foreground)">{selectedLocation.formattedAddress}</span>
            </div>
          </div>
          <div className="shrink-0 ml-2 text-[10px] font-mono text-(--muted-foreground)">
            {selectedLocation.latitude.toFixed(3)}, {selectedLocation.longitude.toFixed(3)}
          </div>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden max-h-64 overflow-y-auto rounded-2xl bg-surface border border-border shadow-2xl animate-slideDown"
          role="listbox"
        >
          {searchError ? (
            <div className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Notice</span>
              </div>
              <p className="text-xs text-(--muted-foreground) leading-relaxed">{searchError}</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((sug, idx) => (
                <button
                  key={sug.placeId || idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(sug)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors border-b border-(--border)/40 last:border-b-0 ${
                    selectedIndex === idx ? "bg-(--primary)/10" : "hover:bg-elevated-surface"
                  }`}
                  role="option"
                  aria-selected={selectedIndex === idx}
                >
                  <div className="p-1.5 rounded-xl mt-0.5 shrink-0 bg-elevated-surface text-(--primary)">
                    {getPlaceIcon(sug.types)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <span className="block truncate text-xs font-bold text-foreground">{sug.mainText}</span>
                    {sug.secondaryText && (
                      <span className="block truncate text-[11px] text-(--muted-foreground) mt-0.5">{sug.secondaryText}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : inputValue.trim() && !isLoading ? (
            <div className="p-4 text-center text-xs text-(--muted-foreground) font-medium">
              No matching places found. Try another landmark or city.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
