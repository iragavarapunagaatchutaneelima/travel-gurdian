"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CITIES, generateRoutes, RouteOption, POI } from "@/data/routeData";
import { 
  CheckCircle2, CloudRain, Sun, Moon, Loader, MapPin, 
  Navigation, Crosshair, Layers, ShieldCheck, Fuel, Coffee, 
  BedDouble, PlusSquare, AlertCircle, Sparkles, Clock, Compass,
  Download, WifiOff, FileText, Check
} from "lucide-react";
import jsPDF from "jspdf";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export const dynamic = "force-dynamic";

function LivingMapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Route parameters
  const fromLoc = searchParams.get("from") || "chennai";
  const toLoc = searchParams.get("dest") || "bangalore";
  const travelMode = searchParams.get("mode") || "Car";
  const routeIdParam = searchParams.get("routeId") || "A";

  const [origin, setOrigin] = useState(CITIES[fromLoc] || CITIES["chennai"]);
  const [dest, setDest] = useState(CITIES[toLoc] || CITIES["bangalore"]);
  const [allRoutes, setAllRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxTokenMissing, setMapboxTokenMissing] = useState(false);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  
  // GPS State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Selected POI card
  const [activePOI, setActivePOI] = useState<POI | null>(null);
  const [weatherCondition, setWeatherCondition] = useState<"sunny" | "rainy" | "cloudy">("sunny");

  // Offline Pack State
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [offlinePackInfo, setOfflinePackInfo] = useState<{ savedAt: string; routeId: string; route: RouteOption; origin: typeof CITIES[string]; dest: typeof CITIES[string] } | null>(null);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    try {
      const stored = localStorage.getItem("offline_travel_pack");
      if (stored) {
        setOfflinePackInfo(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load offline pack", e);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const orig = CITIES[fromLoc] || CITIES["chennai"];
    const dst = CITIES[toLoc] || CITIES["bangalore"];
    setOrigin(orig);
    setDest(dst);

    const routes = generateRoutes(fromLoc, toLoc, travelMode);
    setAllRoutes(routes);
    const route = routes.find(r => r.id === routeIdParam) || routes[0];
    setSelectedRoute(route);
  }, [fromLoc, toLoc, travelMode, routeIdParam]);

  // Mapbox Initialization
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || token === "your_mapbox_public_token" || token === "your_mapbox_public_token_here" || token === "") {
      setMapboxTokenMissing(true);
      return;
    }

    if (!mapContainer.current || !origin || !dest || !selectedRoute) return;

    // Avoid recreation
    if (map.current) {
      updateMapLayers();
      return;
    }

    mapboxgl.accessToken = token;
    
    const styleUrl = mapStyle === "satellite" 
      ? "mapbox://styles/mapbox/satellite-streets-v12" 
      : "mapbox://styles/mapbox/dark-v11";

    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [
        (origin.longitude + dest.longitude) / 2, 
        (origin.latitude + dest.latitude) / 2
      ],
      zoom: 6,
      preserveDrawingBuffer: true // Required for PDF map snapshot
    });

    newMap.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    newMap.on('load', () => {
      map.current = newMap;
      setMapLoaded(true);
      updateMapLayers();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [origin, dest, selectedRoute]);

  // Update map style if changed
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const styleUrl = mapStyle === "satellite" 
      ? "mapbox://styles/mapbox/satellite-streets-v12" 
      : "mapbox://styles/mapbox/dark-v11";
    
    map.current.setStyle(styleUrl);
    map.current.once('style.load', () => {
      updateMapLayers();
    });
  }, [mapStyle]);

  const updateMapLayers = () => {
    if (!map.current || !origin || !dest || !selectedRoute) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Origin Marker
    const originMarker = new mapboxgl.Marker({ color: "#6366f1" })
      .setLngLat([origin.longitude, origin.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4 style="font-weight:bold; color:#18181b;">Origin: ${origin.name}</h4><p style="color:#71717a; font-size:11px;">${origin.state}</p>`))
      .addTo(map.current);
    markersRef.current.push(originMarker);

    // Destination Marker
    const destMarker = new mapboxgl.Marker({ color: "#10b981" })
      .setLngLat([dest.longitude, dest.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4 style="font-weight:bold; color:#18181b;">Destination: ${dest.name}</h4><p style="color:#71717a; font-size:11px;">${dest.state}</p>`))
      .addTo(map.current);
    markersRef.current.push(destMarker);

    // POI Markers
    if (selectedRoute.pois) {
      selectedRoute.pois.forEach(poi => {
        const color = poi.type === "petrol" ? "#f59e0b" : poi.type === "hospital" ? "#ef4444" : poi.type === "hotel" ? "#3b82f6" : "#8b5cf6";
        const poiMarker = new mapboxgl.Marker({ color })
          .setLngLat([poi.longitude, poi.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`
            <div style="padding:4px; font-family:sans-serif; color:#18181b;">
              <b style="font-size:12px;">${poi.name}</b>
              <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">${poi.distanceAhead} • ${poi.status}</p>
            </div>
          `))
          .addTo(map.current!);
        
        poiMarker.getElement().addEventListener('click', () => {
          setActivePOI(poi);
        });
        markersRef.current.push(poiMarker);
      });
    }

    // Add or update GeoJSON route lines
    if (map.current.getSource('route-line')) {
      (map.current.getSource('route-line') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: selectedRoute.waypoints
        }
      });
    } else {
      map.current.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: selectedRoute.waypoints
          }
        }
      });

      map.current.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': selectedRoute.recommendation === "HIGHLY RECOMMENDED" ? '#10b981' : 
                        selectedRoute.recommendation === "RECOMMENDED" ? '#6366f1' : '#f59e0b',
          'line-width': 6,
          'line-opacity': 0.9
        }
      });
    }

    // Fit bounds to route
    const bounds = new mapboxgl.LngLatBounds(
      [origin.longitude, origin.latitude],
      [origin.longitude, origin.latitude]
    );
    selectedRoute.waypoints.forEach(wp => bounds.extend([wp[0], wp[1]]));
    bounds.extend([dest.longitude, dest.latitude]);
    
    map.current.fitBounds(bounds, { padding: 60 });
  };

  // Generate PDF and save to localStorage
  const handleDownloadOfflinePack = async () => {
    if (!selectedRoute || !origin || !dest) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      // 1. Save to local storage
      const packData = {
        savedAt: new Date().toISOString(),
        routeId: selectedRoute.id,
        route: selectedRoute,
        origin,
        dest
      };
      localStorage.setItem("offline_travel_pack", JSON.stringify(packData));
      setOfflinePackInfo(packData);

      // 2. Generate PDF
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(24, 24, 27); // dark zinc
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("TRAVEL GUARDIAN", 15, 20);
      doc.setFontSize(12);
      doc.setTextColor(161, 161, 170); // muted
      doc.text("OFFLINE TRAVEL PACK", 15, 30);

      // Route Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text("ROUTE", 15, 55);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`${origin.name} to ${dest.name}`, 15, 65);
      doc.setFontSize(12);
      doc.text(`Travel Mode: ${travelMode}`, 15, 72);
      doc.text(`Route: ${selectedRoute.name}`, 15, 79);
      doc.setFont("helvetica", "bold");
      doc.text(`Recommendation: ${selectedRoute.recommendation}`, 15, 86);
      
      // Try to capture map image
      let mapY = 100;
      try {
        if (map.current) {
          const canvas = map.current.getCanvas();
          const imgData = canvas.toDataURL("image/jpeg", 0.7);
          doc.addImage(imgData, "JPEG", 15, 95, pageWidth - 30, 80);
          mapY = 185;
        }
      } catch (err) {
        doc.setFont("helvetica", "italic");
        doc.text("Map Snapshot Unavailable", 15, 100);
        mapY = 115;
      }

      // Summary
      doc.setFont("helvetica", "bold");
      doc.text("ROUTE SUMMARY", 15, mapY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Distance: ${selectedRoute.distance}`, 15, mapY + 10);
      doc.text(`Est. Travel Time: ${selectedRoute.time}`, 15, mapY + 16);
      doc.text(`Safety Score: ${selectedRoute.safetyScore}/100`, 15, mapY + 22);
      doc.text(`Traffic: ${selectedRoute.trafficScore}`, 15, mapY + 28);
      doc.text(`Road Condition: ${selectedRoute.roadScore}`, 15, mapY + 34);
      doc.text(`Night Safety: ${selectedRoute.nightSafety}`, 15, mapY + 40);
      
      doc.text(`Weather Risk: Low`, pageWidth / 2, mapY + 10);
      doc.text(`Emergency Access: ${selectedRoute.emergencyAccessScore}/100`, pageWidth / 2, mapY + 16);
      doc.text(`Rest Stops: ${selectedRoute.restStops}`, pageWidth / 2, mapY + 22);
      doc.text(`Fuel Stops: ${selectedRoute.fuelStops}`, pageWidth / 2, mapY + 28);
      
      doc.addPage();
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("IMPORTANT STOPS & POIS", 15, 20);
      
      let poiY = 30;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (selectedRoute.pois && selectedRoute.pois.length > 0) {
        selectedRoute.pois.forEach((poi) => {
          if (poiY > 270) {
            doc.addPage();
            poiY = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.text(poi.name, 15, poiY);
          doc.setFont("helvetica", "normal");
          doc.text(`Type: ${poi.type.toUpperCase()} | Distance: ${poi.distanceAhead} | Status: ${poi.status}`, 15, poiY + 6);
          poiY += 15;
        });
      } else {
        doc.text("No POIs recorded for this route.", 15, 30);
        poiY += 10;
      }

      poiY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("ROUTE WARNINGS & GUIDANCE", 15, poiY);
      poiY += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      const splitNotes = doc.splitTextToSize(`Notes: ${selectedRoute.notes}`, pageWidth - 30);
      doc.text(splitNotes, 15, poiY);
      
      doc.save(`Travel_Guardian_Offline_Pack_${selectedRoute.name.replace(/\s+/g, '_')}.pdf`);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate offline pack. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // GPS Geolocation Handler
  const handleShowMyLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setGpsLoading(false);

        if (map.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          userMarkerRef.current = new mapboxgl.Marker({ color: "#ef4444" })
            .setLngLat([coords.lng, coords.lat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<b>YOUR LOCATION</b><br/>Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`))
            .addTo(map.current);

          map.current.flyTo({
            center: [coords.lng, coords.lat],
            zoom: 12,
            essential: true
          });
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError("GPS permission denied or coordinates unavailable. Enable location access in browser settings.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (!origin || !dest || !selectedRoute) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-xs font-bold text-muted">
        <Loader className="h-6 w-6 animate-spin text-primary-accent mr-2" />
        Loading Live Map Intelligence...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8 flex flex-col items-center transition-colors duration-200">
      <Header />

      {isOffline && (
        <div className="w-full bg-danger text-white py-2 px-4 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="h-4 w-4" />
          OFFLINE MODE — USING SAVED TRAVEL PACK
        </div>
      )}

      <div className="w-full max-w-7xl px-4 md:px-8 py-6 space-y-6">
        
        {/* Header Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 text-left">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-primary-accent font-extrabold uppercase tracking-widest block">
                SENSE Live Map Engine
              </span>
              <span className="text-[10px] text-muted font-bold bg-elevated-surface px-2 py-0.5 rounded-md border border-border">
                {selectedRoute.name}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mt-1">
              {origin.name} ➔ {dest.name}
            </h2>
            <p className="text-xs text-muted font-bold mt-1">
              Mode: {travelMode} • Distance: {selectedRoute.distance} • Est. Time: {selectedRoute.time}
            </p>
          </div>
          
          {/* Controls: Map/Satellite + GPS Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Offline Pack Button */}
            <button
              onClick={handleDownloadOfflinePack}
              disabled={isDownloading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm ${
                downloadSuccess 
                  ? "bg-success/20 text-success border border-success/30" 
                  : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              }`}
              title="Download Offline Travel Pack PDF"
            >
              {isDownloading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : downloadSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{isDownloading ? "Preparing Pack..." : downloadSuccess ? "Pack Ready" : "Download Offline Pack"}</span>
              <span className="sm:hidden">{isDownloading ? "..." : downloadSuccess ? "Ready" : "Offline Pack"}</span>
            </button>
            {/* Style Selector */}
            <div className="flex items-center rounded-2xl bg-surface border border-border p-1 shadow-sm">
              <button
                onClick={() => setMapStyle("streets")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  mapStyle === "streets" ? "bg-primary-accent text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                STREET
              </button>
              <button
                onClick={() => setMapStyle("satellite")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  mapStyle === "satellite" ? "bg-primary-accent text-white shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                SATELLITE
              </button>
            </div>

            {/* GPS My Location Button */}
            <button
              onClick={handleShowMyLocation}
              disabled={gpsLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface border border-border hover:bg-elevated-surface text-foreground text-xs font-black transition-all shadow-sm active:scale-95"
              title="Locate my position on map"
            >
              {gpsLoading ? <Loader className="h-4 w-4 animate-spin text-primary-accent" /> : <Crosshair className="h-4 w-4 text-primary-accent" />}
              <span>Show My Location</span>
            </button>

            {/* Change route button */}
            <button
              onClick={() => router.push(`/plan?from=${fromLoc}&dest=${toLoc}`)}
              className="px-4 py-2.5 rounded-2xl bg-primary-accent/10 hover:bg-primary-accent/20 border border-primary-accent/30 text-primary-accent text-xs font-black transition-all"
            >
              Change Route
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="p-3.5 rounded-2xl bg-warning/10 border border-warning/30 text-warning text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button onClick={() => setGpsError(null)} className="text-xs font-black hover:underline">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Route Detail Panel */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Safety Score Card */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm text-left space-y-5 transition-colors">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-muted uppercase tracking-widest">
                    Route Safety Index
                  </h3>
                  <p className="text-sm font-black text-foreground">{selectedRoute.name}</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 font-black text-base shadow-inner transition-colors ${
                    selectedRoute.safetyScore >= 85 ? "border-success bg-success/10 text-success" : 
                    selectedRoute.safetyScore >= 70 ? "border-info bg-info/10 text-info" : 
                    "border-warning bg-warning/10 text-warning"
                  }`}>
                    {selectedRoute.safetyScore}
                  </div>
                </div>
              </div>

              {/* Day & Night Safety Analysis */}
              <div className="p-3.5 rounded-2xl bg-elevated-surface border border-border space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-amber-400" /> Day Safety:
                  </span>
                  <span className="text-success font-black">Optimal (06:00 - 18:00)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5 text-indigo-400" /> Night Safety:
                  </span>
                  <span className={`font-black ${selectedRoute.nightSafety === "High" ? "text-success" : selectedRoute.nightSafety === "Medium" ? "text-warning" : "text-danger"}`}>
                    {selectedRoute.nightSafety} Rating
                  </span>
                </div>
              </div>

              {/* Progress Bar Metrics */}
              <div className="space-y-3 text-xs font-bold">
                <div>
                  <div className="flex justify-between text-muted mb-1">
                    <span>Traffic Congestion</span>
                    <span className="text-foreground">{selectedRoute.trafficScore}</span>
                  </div>
                  <div className="h-2 w-full bg-elevated-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${selectedRoute.trafficScore === "Low" ? "w-4/5 bg-success" : selectedRoute.trafficScore === "Medium" ? "w-1/2 bg-warning" : "w-1/4 bg-danger"}`} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-muted mb-1">
                    <span>Road Quality Index</span>
                    <span className="text-foreground">{selectedRoute.roadScore}</span>
                  </div>
                  <div className="h-2 w-full bg-elevated-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${selectedRoute.roadScore === "Good" ? "w-5/6 bg-success" : selectedRoute.roadScore === "Moderate" ? "w-3/5 bg-warning" : "w-1/3 bg-danger"}`} 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-muted mb-1">
                    <span>Emergency Accessibility</span>
                    <span className="text-foreground">{selectedRoute.emergencyAccessScore}/100</span>
                  </div>
                  <div className="h-2 w-full bg-elevated-surface rounded-full overflow-hidden">
                    <div className="h-full bg-primary-accent rounded-full" style={{ width: `${selectedRoute.emergencyAccessScore}%` }} />
                  </div>
                </div>
              </div>
              
              {/* Route Notes */}
              <div className="p-3.5 bg-elevated-surface rounded-2xl text-xs text-muted font-semibold leading-relaxed border border-border">
                {selectedRoute.notes}
              </div>

              {/* Amenities Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-center text-muted">
                <div className="p-2 rounded-xl bg-elevated-surface border border-border">
                  <Coffee className="h-4 w-4 mx-auto mb-1 text-primary-accent" />
                  <span className="text-[10px] font-black text-foreground block">{selectedRoute.restStops}</span>
                  <span className="text-[8px] font-bold uppercase">Rest Stops</span>
                </div>
                <div className="p-2 rounded-xl bg-elevated-surface border border-border">
                  <Fuel className="h-4 w-4 mx-auto mb-1 text-warning" />
                  <span className="text-[10px] font-black text-foreground block">{selectedRoute.fuelStops}</span>
                  <span className="text-[8px] font-bold uppercase">Fuel</span>
                </div>
                <div className="p-2 rounded-xl bg-elevated-surface border border-border">
                  <BedDouble className="h-4 w-4 mx-auto mb-1 text-info" />
                  <span className="text-[10px] font-black text-foreground block">{selectedRoute.hotels}</span>
                  <span className="text-[8px] font-bold uppercase">Hotels</span>
                </div>
                <div className="p-2 rounded-xl bg-elevated-surface border border-border">
                  <PlusSquare className="h-4 w-4 mx-auto mb-1 text-danger" />
                  <span className="text-[10px] font-black text-foreground block">Active</span>
                  <span className="text-[8px] font-bold uppercase">SOS</span>
                </div>
              </div>
            </div>

            {/* Selected POI Card */}
            {activePOI && (
              <div className="rounded-3xl border border-primary-accent/40 bg-surface p-5 text-left space-y-3 shadow-md animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-primary-accent uppercase tracking-wider block">
                      Selected Route POI
                    </span>
                    <h4 className="font-black text-sm text-foreground">{activePOI.name}</h4>
                  </div>
                  <button onClick={() => setActivePOI(null)} className="text-muted hover:text-foreground text-xs p-1">✕</button>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted font-semibold">
                  <span>{activePOI.distanceAhead}</span>
                  <span>•</span>
                  <span className="text-success font-bold">{activePOI.status}</span>
                </div>
                <div className="text-[10px] text-muted italic">
                  DEMO POI: Marker calibrated along corridor coordinates.
                </div>
              </div>
            )}

            {/* Offline Suggestions (Only when offline) */}
            {isOffline && offlinePackInfo && (
              <div className="rounded-3xl border border-warning/40 bg-warning/5 p-5 text-left space-y-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff className="h-4 w-4 text-warning" />
                  <span className="text-[10px] font-black text-warning uppercase tracking-wider block">
                    Offline Safety Information
                  </span>
                </div>
                <div className="space-y-2 text-xs font-semibold text-muted">
                  <p>Next Rest Stop: {offlinePackInfo.route.restStops}</p>
                  <p>Next Fuel Stop: {offlinePackInfo.route.fuelStops}</p>
                  <p>Emergency Services: {offlinePackInfo.route.emergencyAccessScore}/100</p>
                </div>
                <div className="text-[10px] text-muted italic mt-2">
                  Last updated: {new Date(offlinePackInfo.savedAt).toLocaleString()}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Mapbox GL JS Container */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative w-full aspect-[4/3] md:aspect-[16/10] rounded-[32px] border border-border bg-elevated-surface overflow-hidden shadow-lg">
              
              {mapboxTokenMissing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-surface">
                  <div className="p-4 rounded-3xl bg-primary-accent/10 border border-primary-accent/20">
                    <MapPin className="h-10 w-10 text-primary-accent" />
                  </div>
                  <h3 className="text-xl font-black text-foreground">MAP PREVIEW MODE</h3>
                  <p className="text-xs md:text-sm text-muted max-w-md leading-relaxed">
                    Interactive Mapbox GL service requires your public token. To enable high-resolution satellite tiles and turn navigation, configure <code className="bg-elevated-surface px-2 py-0.5 rounded text-primary-accent font-mono">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your environment variables.
                  </p>
                  <div className="p-4 rounded-2xl bg-elevated-surface border border-border text-left w-full max-w-md text-xs space-y-1 text-muted">
                    <span className="font-bold text-foreground block">Active Simulated Route:</span>
                    <div className="flex justify-between"><span>Origin:</span> <span className="font-bold text-foreground">{origin.name} ({origin.state})</span></div>
                    <div className="flex justify-between"><span>Destination:</span> <span className="font-bold text-foreground">{dest.name} ({dest.state})</span></div>
                    <div className="flex justify-between"><span>Safety Corridor:</span> <span className="font-bold text-success">{selectedRoute.name} ({selectedRoute.safetyScore}/100)</span></div>
                  </div>
                </div>
              ) : (
                <div ref={mapContainer} className="w-full h-full" />
              )}
              
            </div>

            {/* Route Selector Switcher */}
            <div className={`rounded-2xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm ${isOffline ? "opacity-50 pointer-events-none" : ""}`}>
              <span className="text-xs font-black text-muted uppercase tracking-wider">
                Select Alternative Route Profile:
              </span>
              <div className="flex flex-wrap gap-2">
                {allRoutes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoute(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      selectedRoute.id === r.id
                        ? "bg-primary-accent text-white shadow-md"
                        : "bg-elevated-surface hover:bg-border text-foreground border border-border"
                    }`}
                  >
                    Route {r.id}: {r.name.split(" ")[0]} ({r.safetyScore}/100)
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}

export default function LivingMap() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-muted flex flex-col items-center justify-center gap-3 text-xs font-bold">
        <Loader className="h-6 w-6 animate-spin text-primary-accent" />
        <span>Loading Safe Haven Living Map...</span>
      </div>
    }>
      <LivingMapContent />
    </Suspense>
  );
}
