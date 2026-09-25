"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  Crosshair, 
  MapPin, 
  Hospital, 
  ShieldAlert, 
  Fuel, 
  Coffee, 
  Navigation, 
  Phone, 
  Layers, 
  Sparkles, 
  Loader2, 
  X,
  AlertTriangle
} from "lucide-react";
import { useSharedLocation } from "../../hooks/useSharedLocation";
import { loadGoogleMapsScript, formatMapErrorMessage } from "../../services/googlePlaces";

export interface PinnedPlace {
  id: string;
  name: string;
  type: string;
  category: "hospital" | "police" | "fuel" | "cafe" | "rest" | "general";
  distance?: string;
  distanceKm?: number;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  amenities?: string;
}

interface GuardianMapSyncProps {
  pinnedPlaces?: PinnedPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: PinnedPlace) => void;
  onAskAIAboutPlace?: (place: PinnedPlace) => void;
  className?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; pinHex: string }> = {
  hospital: { bg: "#FEE2E2", border: "#EF4444", text: "#DC2626", pinHex: "#EF4444" },
  pharmacy: { bg: "#F3E8FF", border: "#A855F7", text: "#7E22CE", pinHex: "#A855F7" },
  police: { bg: "#DBEAFE", border: "#2563FF", text: "#1D4ED8", pinHex: "#2563FF" },
  fuel: { bg: "#FEF3C7", border: "#F59E0B", text: "#B45309", pinHex: "#F59E0B" },
  cafe: { bg: "#DCFCE7", border: "#22C55E", text: "#15803D", pinHex: "#22C55E" },
  rest: { bg: "#E0F2FE", border: "#0284C7", text: "#0369A1", pinHex: "#0284C7" },
  general: { bg: "#E2E8F0", border: "#64748B", text: "#334155", pinHex: "#64748B" }
};

export default function GuardianMapSync({
  pinnedPlaces = [],
  selectedPlaceId,
  onSelectPlace,
  onAskAIAboutPlace,
  className = ""
}: GuardianMapSyncProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activePlace, setActivePlace] = useState<PinnedPlace | null>(null);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");

  const { latitude, longitude, accuracy, locate, isLoading: isLocating, permissionStatus } = useSharedLocation();

  // Initialize Google Maps instance
  useEffect(() => {
    let isCancelled = false;

    if (!mapContainerRef.current || mapRef.current) return;

    loadGoogleMapsScript()
      .then(() => {
        if (isCancelled || !mapContainerRef.current || mapRef.current) return;

        const defaultCenter = latitude && longitude 
          ? { lat: latitude, lng: longitude } 
          : { lat: 13.0827, lng: 80.2707 }; // Chennai regional center fallback

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: latitude && longitude ? 13 : 9,
          mapTypeId: mapStyle === "satellite" 
            ? window.google.maps.MapTypeId.HYBRID 
            : window.google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          },
          gestureHandling: "greedy"
        });

        mapRef.current = map;
        setMapLoaded(true);
        setMapError(null);
      })
      .catch((err) => {
        console.error("Failed to load Google Maps for GuardianMapSync:", err);
        setMapError(formatMapErrorMessage(err));
      });

    return () => {
      isCancelled = true;
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.setMap(null);
        userCircleRef.current = null;
      }
      mapRef.current = null;
    };
  }, []);

  // Handle map type changes (streets vs satellite)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.google?.maps) return;
    mapRef.current.setMapTypeId(
      mapStyle === "satellite" 
        ? window.google.maps.MapTypeId.HYBRID 
        : window.google.maps.MapTypeId.ROADMAP
    );
  }, [mapStyle, mapLoaded]);

  // Sync user GPS marker & accuracy circle
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || latitude === null || longitude === null || !window.google?.maps) return;

    const userLatLng = new window.google.maps.LatLng(latitude, longitude);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userLatLng);
    } else {
      userMarkerRef.current = new window.google.maps.Marker({
        position: userLatLng,
        map: mapRef.current,
        title: "Your Live GPS Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#2563FF",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2.5
        },
        zIndex: 999
      });
    }

    if (accuracy && accuracy > 0) {
      if (userCircleRef.current) {
        userCircleRef.current.setCenter(userLatLng);
        userCircleRef.current.setRadius(accuracy);
      } else {
        userCircleRef.current = new window.google.maps.Circle({
          strokeColor: "#2563FF",
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: "#2563FF",
          fillOpacity: 0.12,
          map: mapRef.current,
          center: userLatLng,
          radius: accuracy,
          zIndex: 998
        });
      }
    }
  }, [latitude, longitude, accuracy, mapLoaded]);

  // Sync Pinned Places (Safe Havens from AI / nearby tool)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.google?.maps) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasBoundsPoints = false;

    if (latitude && longitude) {
      bounds.extend(new window.google.maps.LatLng(latitude, longitude));
      hasBoundsPoints = true;
    }

    pinnedPlaces.forEach((place) => {
      const colors = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.general;
      const isSelected = selectedPlaceId === place.id;
      const pos = new window.google.maps.LatLng(place.latitude, place.longitude);
      bounds.extend(pos);
      hasBoundsPoints = true;

      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: place.name,
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: colors.pinHex,
          fillOpacity: 1,
          strokeColor: isSelected ? "#0F172A" : "#FFFFFF",
          strokeWeight: isSelected ? 2.5 : 1.5,
          scale: isSelected ? 1.7 : 1.3,
          anchor: new window.google.maps.Point(12, 22)
        },
        zIndex: isSelected ? 200 : 100
      });

      marker.addListener("click", () => {
        setActivePlace(place);
        if (onSelectPlace) onSelectPlace(place);
        if (mapRef.current) {
          mapRef.current.panTo(pos);
          mapRef.current.setZoom(15);
        }
      });

      markersRef.current.push(marker);
    });

    if (hasBoundsPoints && pinnedPlaces.length > 0) {
      mapRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [pinnedPlaces, selectedPlaceId, mapLoaded, longitude, latitude, onSelectPlace]);

  const handleLocateMe = async () => {
    const loc = await locate(true);
    if (loc.latitude && loc.longitude && mapRef.current && window.google?.maps) {
      const pos = new window.google.maps.LatLng(loc.latitude, loc.longitude);
      mapRef.current.panTo(pos);
      mapRef.current.setZoom(15);
    }
  };

  return (
    <div className={`relative w-full h-full min-h-75 overflow-hidden rounded-3xl border border-border bg-surface ${className}`}>
      
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading & Error States */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-(--surface)/90 backdrop-blur-sm z-10">
          <Loader2 className="h-8 w-8 text-(--primary) animate-spin mb-2" />
          <p className="text-xs font-bold text-foreground">Connecting to Google Maps...</p>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-surface z-10">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 mb-2 border border-amber-500/20">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-foreground mb-1">Google Maps Notice</h4>
          <p className="text-xs text-(--muted-foreground) max-w-sm">{mapError}</p>
        </div>
      )}

      {/* Floating Header Controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-(--surface)/90 backdrop-blur-md border border-border text-xs font-semibold text-foreground shadow-sm pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live GPS Synchronization</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map style toggle */}
          <button
            type="button"
            onClick={() => setMapStyle(s => s === "streets" ? "satellite" : "streets")}
            className="p-2 rounded-xl bg-(--surface)/90 backdrop-blur-md border border-border text-foreground hover:bg-elevated-surface shadow-sm transition-colors text-xs font-semibold flex items-center gap-1"
            title="Toggle Map View"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline capitalize">{mapStyle}</span>
          </button>

          {/* Locate Me button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="p-2 rounded-xl bg-(--primary) text-white hover:opacity-90 shadow-md transition-all flex items-center gap-1.5 text-xs font-bold disabled:opacity-50"
            title="Recenter on current GPS position"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Locate Me</span>
          </button>
        </div>
      </div>

      {/* Selected Place Overlay Card */}
      {activePlace && (
        <div className="absolute bottom-3 left-3 right-3 p-4 rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border shadow-xl z-20 transition-all animate-slideUp">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div 
                className="p-2.5 rounded-xl shrink-0"
                style={{
                  backgroundColor: CATEGORY_COLORS[activePlace.category]?.bg || "#EFF6FF",
                  color: CATEGORY_COLORS[activePlace.category]?.text || "#2563FF"
                }}
              >
                {activePlace.category === "hospital" && <Hospital className="h-5 w-5" />}
                {activePlace.category === "police" && <ShieldAlert className="h-5 w-5" />}
                {activePlace.category === "fuel" && <Fuel className="h-5 w-5" />}
                {activePlace.category === "cafe" && <Coffee className="h-5 w-5" />}
                {activePlace.category !== "hospital" && activePlace.category !== "police" && activePlace.category !== "fuel" && activePlace.category !== "cafe" && (
                  <MapPin className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{activePlace.name}</h4>
                  {activePlace.distance && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-(--primary)/10 text-(--primary)">
                      {activePlace.distance}
                    </span>
                  )}
                </div>
                <p className="text-xs text-(--muted-foreground) mt-0.5">{activePlace.address}</p>
                {activePlace.amenities && (
                  <p className="text-[11px] text-(--muted-foreground) mt-1">
                    <span className="font-medium text-foreground">Amenities:</span> {activePlace.amenities}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setActivePlace(null)}
              className="p-1 rounded-lg text-(--muted-foreground) hover:bg-elevated-surface"
              title="Close card"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
            {onAskAIAboutPlace && (
              <button
                type="button"
                onClick={() => onAskAIAboutPlace(activePlace)}
                className="py-1.5 px-3 rounded-xl bg-(--primary) text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-3 w-3" />
                <span>Ask AI About Place</span>
              </button>
            )}

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activePlace.latitude},${activePlace.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-xl bg-elevated-surface text-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-surface border border-border transition-colors"
            >
              <Navigation className="h-3 w-3 text-(--primary)" />
              <span>Get Directions</span>
            </a>

            {activePlace.phone && (
              <a
                href={`tel:${activePlace.phone}`}
                className="py-1.5 px-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 border border-red-200 dark:border-red-900 transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span>Call {activePlace.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Permission warning banner if permission denied */}
      {permissionStatus === "denied" && (
        <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium z-10 flex items-center justify-between">
          <span>GPS permission denied. Enable location in browser settings to display real-time havens near you.</span>
          <button
            type="button"
            onClick={handleLocateMe}
            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] shrink-0 ml-2"
          >
            Retry
          </button>
        </div>
      )}

    </div>
  );
}
