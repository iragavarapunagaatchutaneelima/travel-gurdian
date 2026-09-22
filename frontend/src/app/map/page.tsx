"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CITIES, RouteOption, POI, City } from "@/data/routeData";
import { calculateGoogleRoutes } from "@/services/googleRoutes";
import { TravelerProfile, RoutePriority, IncidentReport, IncidentType } from "@/types/safety";
import { LocationDetails } from "@/types/location";
import { getActiveIncidents, reportCommunityIncident } from "@/services/incidentService";
import { useLiveNavigation } from "@/hooks/useLiveNavigation";
import LiveNavigationOverlay from "../components/LiveNavigationOverlay";
import { useSafetyCheckIn } from "@/hooks/useSafetyCheckIn";
import SafetyCheckInWidget from "../components/SafetyCheckInWidget";
import TravelAssistant from "../components/TravelAssistant";
import { getTrustedContacts } from "@/services/trustedContactService";
import { TrustedContact } from "@/types/safetyCheckIn";
import { LiveTravelContext } from "@/types/gemini";
import { 
  CheckCircle2, CloudRain, Sun, Moon, Loader, MapPin, 
  Navigation, Crosshair, Layers, ShieldCheck, Fuel, Coffee, 
  BedDouble, PlusSquare, AlertCircle, Sparkles, Clock, Compass,
  Download, WifiOff, FileText, Check, Loader2, Hospital, ShieldAlert,
  Plus, X, AlertTriangle, Play, Bot
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
  const fromName = searchParams.get("fromName");
  const destName = searchParams.get("destName");
  const fromLat = searchParams.get("fromLat");
  const fromLng = searchParams.get("fromLng");
  const destLat = searchParams.get("destLat");
  const destLng = searchParams.get("destLng");
  const fromAddress = searchParams.get("fromAddress");
  const destAddress = searchParams.get("destAddress");
  const fromPlaceId = searchParams.get("fromPlaceId");
  const destPlaceId = searchParams.get("destPlaceId");
  const travelMode = (searchParams.get("mode") as any) || "Car";
  const profileParam = (searchParams.get("profile") as TravelerProfile) || "Solo";
  const priorityParam = (searchParams.get("priority") as RoutePriority) || "Balanced";
  const routeIdParam = searchParams.get("routeId") || "A";
  const startNavParam = searchParams.get("startNav") === "true";

  const [origin, setOrigin] = useState<City>(CITIES[fromLoc] || CITIES["chennai"]);
  const [dest, setDest] = useState<City>(CITIES[toLoc] || CITIES["bangalore"]);
  const [allRoutes, setAllRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  // Layer Toggles
  const [activeLayers, setActiveLayers] = useState({
    hospitals: true,
    police: true,
    pharmacies: true,
    fuel: true,
    rest: true,
    incidents: true
  });

  // Incident reporting modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>("Road blocked");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [incidentReportSuccess, setIncidentReportSuccess] = useState(false);
  const [communityIncidents, setCommunityIncidents] = useState<IncidentReport[]>([]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxTokenMissing, setMapboxTokenMissing] = useState(false);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  
  // GPS Geolocation State for single-shot Locate Button
  const [gpsLoading, setGpsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Selected POI card
  const [activePOI, setActivePOI] = useState<POI | null>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentReport | null>(null);

  // Offline Pack State
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [offlinePackInfo, setOfflinePackInfo] = useState<{ savedAt: string; routeId: string; route: RouteOption; origin: typeof CITIES[string]; dest: typeof CITIES[string] } | null>(null);

  const destinationDetails: LocationDetails = {
    placeId: destPlaceId || (toLoc.startsWith("ChIJ") ? toLoc : ""),
    name: dest.name,
    formattedAddress: dest.state,
    latitude: dest.latitude,
    longitude: dest.longitude
  };

  // Phase 4 Live Navigation Controller
  const {
    status: navStatus,
    activeRoute: navActiveRoute,
    currentPosition: navPosition,
    progress: navProgress,
    currentManeuver: navCurrentManeuver,
    nextManeuver: navNextManeuver,
    isFollowMode,
    setIsFollowMode,
    gpsError: navGpsError,
    gpsAccuracyWarning: navGpsAccuracyWarning,
    rerouteProposal,
    isRerouting,
    startNavigation,
    endNavigation,
    requestReroute,
    approveReroute,
    rejectReroute
  } = useLiveNavigation({
    initialRoute: selectedRoute,
    destination: destinationDetails,
    travelMode,
    profile: profileParam,
    priority: priorityParam,
    onRouteUpdated: (newRoute) => {
      setSelectedRoute(newRoute);
      setAllRoutes(prev => [newRoute, ...prev.filter(r => r.id !== newRoute.id)]);
    }
  });

  // Phase 5 Safety Check-In Controller
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [showAssistant, setShowAssistant] = useState(false);

  const {
    status: checkInStatus,
    config: checkInConfig,
    activeCycle: checkInCycle,
    secondsRemaining: checkInSecondsRemaining,
    graceSecondsRemaining: checkInGraceSecondsRemaining,
    lastKnownSnapshot: checkInLocationSnapshot,
    escalationResult: checkInEscalationResult,
    startCheckIn,
    confirmSafety,
    requestHelp,
    cancelCheckIn,
    resolveOnArrival
  } = useSafetyCheckIn({
    destinationName: dest?.name || destinationDetails.name,
    currentPosition: navPosition
  });

  // Phase 6 Live Context for Gemini Assistant
  const liveTravelContext: LiveTravelContext = {
    navStatus,
    activeRoute: navActiveRoute || selectedRoute,
    currentPosition: navPosition,
    progress: navProgress,
    safetyScore: selectedRoute?.safetyScore,
    safetyAssessment: selectedRoute?.safetyAssessment,
    checkInStatus,
    activeCheckInCycle: checkInCycle,
    checkInSecondsRemaining,
    trustedContactsCount: trustedContacts.filter(c => c.enabled).length,
    originName: origin.name,
    destinationName: dest.name,
    travelMode
  };

  // Arrival Integration: resolve active safety check-in cleanly on arrival
  useEffect(() => {
    if (navStatus === "ARRIVED") {
      resolveOnArrival();
    }
  }, [navStatus, resolveOnArrival]);

  useEffect(() => {
    setTrustedContacts(getTrustedContacts());
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setCommunityIncidents(getActiveIncidents());

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

  const loadRoutesData = () => {
    let orig: City = CITIES[fromLoc.toLowerCase()] || CITIES["chennai"];
    if (fromLat && fromLng) {
      orig = {
        id: fromLoc,
        name: fromName || orig.name,
        state: fromAddress || orig.state,
        latitude: parseFloat(fromLat),
        longitude: parseFloat(fromLng),
        region: "Selected Location",
        highways: ["Corridor Road"]
      };
    }

    let dst: City = CITIES[toLoc.toLowerCase()] || CITIES["bangalore"];
    if (destLat && destLng) {
      dst = {
        id: toLoc,
        name: destName || dst.name,
        state: destAddress || dst.state,
        latitude: parseFloat(destLat),
        longitude: parseFloat(destLng),
        region: "Selected Location",
        highways: ["Corridor Road"]
      };
    }

    setOrigin(orig);
    setDest(dst);
    setRouteLoading(true);
    setRouteError(null);

    const originDetails: LocationDetails = {
      placeId: fromPlaceId || (fromLoc.startsWith("ChIJ") ? fromLoc : ""),
      name: orig.name,
      formattedAddress: orig.state,
      latitude: orig.latitude,
      longitude: orig.longitude
    };

    const destDetailsObj: LocationDetails = {
      placeId: destPlaceId || (toLoc.startsWith("ChIJ") ? toLoc : ""),
      name: dst.name,
      formattedAddress: dst.state,
      latitude: dst.latitude,
      longitude: dst.longitude
    };

    calculateGoogleRoutes(originDetails, destDetailsObj, travelMode, profileParam, priorityParam)
      .then((realRoutes) => {
        setAllRoutes(realRoutes);
        const route = realRoutes.find(r => r.id === routeIdParam) || realRoutes[0];
        setSelectedRoute(route);
        setRouteLoading(false);

        if (startNavParam) {
          setTimeout(() => {
            startNavigation();
          }, 600);
        }
      })
      .catch((err) => {
        console.error("Failed to calculate real Google routes for map:", err);
        setRouteError(err.message || "Unable to calculate Google route for this location.");
        setRouteLoading(false);
      });
  };

  useEffect(() => {
    loadRoutesData();
  }, [fromLoc, toLoc, fromName, destName, fromLat, fromLng, destLat, destLng, fromAddress, destAddress, fromPlaceId, destPlaceId, travelMode, profileParam, priorityParam, routeIdParam]);

  // Mapbox Initialization
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || token === "your_mapbox_public_token" || token === "your_mapbox_public_token_here" || token === "") {
      setMapboxTokenMissing(true);
      return;
    }

    if (!mapContainer.current || !origin || !dest || !selectedRoute) return;

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
      preserveDrawingBuffer: true
    });

    newMap.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    newMap.on('dragstart', () => {
      setIsFollowMode(false);
    });

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

  // Re-render markers whenever activeLayers changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      updateMapLayers();
    }
  }, [activeLayers]);

  // Live GPS User Position Marker update on Mapbox
  useEffect(() => {
    if (!map.current || !mapLoaded || !navPosition) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([navPosition.longitude, navPosition.latitude]);
      const el = userMarkerRef.current.getElement();
      const dot = el.querySelector(".tg-marker-dot") as HTMLElement;
      if (dot && navPosition.heading !== null && navPosition.heading !== undefined) {
        dot.style.transform = `rotate(${navPosition.heading}deg)`;
        dot.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>`;
      }
    } else {
      const container = document.createElement("div");
      container.className = "tg-gps-user-marker";
      container.style.width = "32px";
      container.style.height = "32px";
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.position = "relative";

      const pulse = document.createElement("div");
      pulse.style.position = "absolute";
      pulse.style.inset = "0";
      pulse.style.borderRadius = "50%";
      pulse.style.backgroundColor = "rgba(99, 102, 241, 0.35)";
      pulse.style.animation = "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite";
      container.appendChild(pulse);

      const dot = document.createElement("div");
      dot.className = "tg-marker-dot";
      dot.style.width = "22px";
      dot.style.height = "22px";
      dot.style.borderRadius = "50%";
      dot.style.backgroundColor = "#6366f1";
      dot.style.border = "3px solid #ffffff";
      dot.style.boxShadow = "0 0 12px rgba(99, 102, 241, 0.8)";
      dot.style.display = "flex";
      dot.style.alignItems = "center";
      dot.style.justifyContent = "center";
      dot.style.position = "relative";
      dot.style.zIndex = "2";
      dot.style.transition = "transform 0.3s ease";

      if (navPosition.heading !== null && navPosition.heading !== undefined) {
        dot.style.transform = `rotate(${navPosition.heading}deg)`;
        dot.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>`;
      } else {
        dot.innerHTML = `<div style="width:6px; height:6px; background:white; border-radius:50%;"></div>`;
      }
      container.appendChild(dot);

      userMarkerRef.current = new mapboxgl.Marker({ element: container })
        .setLngLat([navPosition.longitude, navPosition.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<b>YOUR LIVE GPS POSITION</b><br/>Accuracy: ±${Math.round(navPosition.accuracy)}m`))
        .addTo(map.current);
    }

    if (isFollowMode && navStatus === "ACTIVE") {
      map.current.easeTo({
        center: [navPosition.longitude, navPosition.latitude],
        zoom: 15,
        duration: 800
      });
    }
  }, [navPosition, isFollowMode, navStatus, mapLoaded]);

  const updateMapLayers = () => {
    if (!map.current || !origin || !dest || !selectedRoute) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Origin Marker (Purple)
    const originMarker = new mapboxgl.Marker({ color: "#6366f1" })
      .setLngLat([origin.longitude, origin.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4 style="font-weight:bold; color:#18181b;">Origin: ${origin.name}</h4><p style="color:#71717a; font-size:11px;">${origin.state}</p>`))
      .addTo(map.current);
    markersRef.current.push(originMarker);

    // Destination Marker (Green)
    const destMarker = new mapboxgl.Marker({ color: "#10b981" })
      .setLngLat([dest.longitude, dest.latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h4 style="font-weight:bold; color:#18181b;">Destination: ${dest.name}</h4><p style="color:#71717a; font-size:11px;">${dest.state}</p>`))
      .addTo(map.current);
    markersRef.current.push(destMarker);

    // Real POI Markers filtered by active toggles
    if (selectedRoute.pois) {
      selectedRoute.pois.forEach(poi => {
        if (poi.type === "hospital" && !activeLayers.hospitals) return;
        if (poi.type === "police" && !activeLayers.police) return;
        if (poi.type === "pharmacy" && !activeLayers.pharmacies) return;
        if (poi.type === "petrol" && !activeLayers.fuel) return;
        if ((poi.type === "food" || poi.type === "rest") && !activeLayers.rest) return;

        const color = poi.type === "hospital" ? "#ef4444" : 
                      poi.type === "police" ? "#3b82f6" : 
                      poi.type === "pharmacy" ? "#a855f7" :
                      poi.type === "petrol" ? "#f59e0b" : "#10b981";

        const poiMarker = new mapboxgl.Marker({ color })
          .setLngLat([poi.longitude, poi.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`
            <div style="padding:4px; font-family:sans-serif; color:#18181b;">
              <span style="font-size:9px; font-weight:bold; text-transform:uppercase; color:${color};">${poi.type.toUpperCase()} • VERIFIED GOOGLE PLACE</span>
              <b style="font-size:12px; display:block; margin-top:2px;">${poi.name}</b>
              <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">${poi.distanceAhead} • ${poi.status}</p>
            </div>
          `))
          .addTo(map.current!);
        
        poiMarker.getElement().addEventListener('click', () => {
          setActivePOI(poi);
          setActiveIncident(null);
        });
        markersRef.current.push(poiMarker);
      });
    }

    // Community Incident Markers
    if (activeLayers.incidents && communityIncidents.length > 0) {
      communityIncidents.forEach(inc => {
        const incMarker = new mapboxgl.Marker({ color: "#dc2626" })
          .setLngLat([inc.longitude, inc.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`
            <div style="padding:4px; font-family:sans-serif; color:#18181b;">
              <span style="font-size:9px; font-weight:bold; text-transform:uppercase; color:#dc2626;">⚠️ USER REPORTED HAZARD</span>
              <b style="font-size:12px; display:block; margin-top:2px;">${inc.type}</b>
              <p style="margin:2px 0 0 0; font-size:10px; color:#64748b;">${inc.description}</p>
              <span style="font-size:8px; color:#a1a1aa; margin-top:4px; display:block;">Reported: ${new Date(inc.timestamp).toLocaleTimeString()}</span>
            </div>
          `))
          .addTo(map.current!);

        incMarker.getElement().addEventListener('click', () => {
          setActiveIncident(inc);
          setActivePOI(null);
        });
        markersRef.current.push(incMarker);
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
          'line-color': selectedRoute.safetyScore >= 85 ? '#10b981' : 
                        selectedRoute.safetyScore >= 70 ? '#6366f1' : '#f59e0b',
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

  const handleReportHazard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDesc.trim() || !selectedRoute) return;

    // Report at approximately route midpoint or origin
    const midPoint = selectedRoute.waypoints[Math.floor(selectedRoute.waypoints.length / 2)] || [origin.longitude, origin.latitude];
    reportCommunityIncident(
      incidentType,
      midPoint[1],
      midPoint[0],
      incidentDesc,
      selectedRoute.name
    );

    const updated = getActiveIncidents();
    setCommunityIncidents(updated);
    setIncidentReportSuccess(true);
    setIncidentDesc("");
    setTimeout(() => {
      setShowIncidentModal(false);
      setIncidentReportSuccess(false);
      loadRoutesData(); // Re-evaluate safety fit with newly reported community incident
    }, 1200);
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

  if (routeLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-xs font-bold text-muted gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary-accent" />
        <span>Calculating Real Google Road Network Route...</span>
      </div>
    );
  }

  if (routeError || !selectedRoute) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-xs font-bold p-6 text-center">
        <Header />
        <div className="max-w-md w-full p-6 rounded-3xl bg-surface border border-warning/30 space-y-4 my-auto">
          <AlertCircle className="h-10 w-10 text-warning mx-auto" />
          <h3 className="text-lg font-black text-foreground">Route Calculation Notice</h3>
          <p className="text-xs text-muted font-semibold leading-relaxed">
            {routeError || "No real road route could be calculated for this location."}
          </p>
          <button
            onClick={() => router.push(`/plan?from=${fromLoc}&dest=${toLoc}`)}
            className="w-full py-3 rounded-2xl bg-primary-accent text-white font-black hover:bg-primary-accent-hover transition-all"
          >
            Return to Journey Planner
          </button>
        </div>
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

        {/* Layer Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-1 shrink-0 mr-1">
            <Layers className="h-3.5 w-3.5 text-primary-accent" /> Layers:
          </span>
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, hospitals: !prev.hospitals }))}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeLayers.hospitals 
                ? "bg-red-500/15 text-red-400 border border-red-500/30" 
                : "bg-surface text-muted border border-border opacity-60"
            }`}
          >
            <Hospital className="h-3.5 w-3.5" />
            Hospitals ({selectedRoute.pois?.filter(p => p.type === "hospital").length || 0})
          </button>
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, police: !prev.police }))}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeLayers.police 
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" 
                : "bg-surface text-muted border border-border opacity-60"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Police ({selectedRoute.pois?.filter(p => p.type === "police").length || 0})
          </button>
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, pharmacies: !prev.pharmacies }))}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeLayers.pharmacies 
                ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" 
                : "bg-surface text-muted border border-border opacity-60"
            }`}
          >
            <PlusSquare className="h-3.5 w-3.5" />
            Pharmacies ({selectedRoute.pois?.filter(p => p.type === "pharmacy").length || 0})
          </button>
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, fuel: !prev.fuel }))}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeLayers.fuel 
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" 
                : "bg-surface text-muted border border-border opacity-60"
            }`}
          >
            <Fuel className="h-3.5 w-3.5" />
            Fuel ({selectedRoute.pois?.filter(p => p.type === "petrol").length || 0})
          </button>
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, rest: !prev.rest }))}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeLayers.rest 
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                : "bg-surface text-muted border border-border opacity-60"
            }`}
          >
            <Coffee className="h-3.5 w-3.5" />
            Food & Rest ({selectedRoute.pois?.filter(p => p.type === "food" || p.type === "rest").length || 0})
          </button>
          <button
            onClick={() => setActiveLayers(prev => ({ ...prev, incidents: !prev.incidents }))}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              activeLayers.incidents 
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" 
                : "bg-surface text-muted border border-border opacity-60"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Hazards ({communityIncidents.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Route Safety Assessment Panel */}
          <div className="lg:col-span-4 space-y-5">

            {/* Start Live Navigation Action Button */}
            <button
              onClick={startNavigation}
              className="w-full py-4 px-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Navigation className="h-5 w-5 fill-white" />
              <span>START LIVE NAVIGATION</span>
            </button>

            {/* Safety Check-In Pre-Trip Card */}
            <SafetyCheckInWidget
              status={checkInStatus}
              config={checkInConfig}
              activeCycle={checkInCycle}
              secondsRemaining={checkInSecondsRemaining}
              graceSecondsRemaining={checkInGraceSecondsRemaining}
              lastKnownSnapshot={checkInLocationSnapshot}
              escalationResult={checkInEscalationResult}
              trustedContacts={trustedContacts}
              onStart={startCheckIn}
              onConfirmSafe={confirmSafety}
              onRequestHelp={requestHelp}
              onCancel={cancelCheckIn}
            />
            
            {/* Safety Fit Card */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm text-left space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-muted uppercase tracking-widest">
                      Safety Fit
                    </h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      selectedRoute.safetyAssessment?.confidence === "HIGH" ? "bg-success/15 text-success" :
                      selectedRoute.safetyAssessment?.confidence === "MEDIUM" ? "bg-info/15 text-info" :
                      "bg-warning/15 text-warning"
                    }`}>
                      {selectedRoute.safetyAssessment?.confidence || "MEDIUM"} Confidence
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground">{selectedRoute.name}</p>
                </div>
                
                <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 font-black text-lg shadow-inner transition-colors ${
                  selectedRoute.safetyScore >= 80 ? "border-success bg-success/10 text-success" : 
                  selectedRoute.safetyScore >= 65 ? "border-info bg-info/10 text-info" : 
                  "border-warning bg-warning/10 text-warning"
                }`}>
                  {selectedRoute.safetyScore}
                </div>
              </div>

              {/* Factors Summary Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-elevated-surface border border-border space-y-1">
                  <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                    <Hospital className="h-3 w-3 text-red-400" /> Medical Access
                  </span>
                  <p className="font-black text-foreground">
                    {selectedRoute.safetyAssessment?.factors.medicalAccess.rating || "Moderate"}
                  </p>
                  <span className="text-[9px] text-muted block">
                    {selectedRoute.safetyAssessment?.factors.medicalAccess.details || `${selectedRoute.pois?.filter(p => p.type === "hospital").length || 0} hospitals nearby`}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-elevated-surface border border-border space-y-1">
                  <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-blue-400" /> Police Access
                  </span>
                  <p className="font-black text-foreground">
                    {selectedRoute.safetyAssessment?.factors.policeAccess.rating || "Moderate"}
                  </p>
                  <span className="text-[9px] text-muted block">
                    {selectedRoute.safetyAssessment?.factors.policeAccess.details || `${selectedRoute.pois?.filter(p => p.type === "police").length || 0} police nodes nearby`}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-elevated-surface border border-border space-y-1">
                  <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                    <Fuel className="h-3 w-3 text-amber-400" /> Fuel Access
                  </span>
                  <p className="font-black text-foreground">
                    {selectedRoute.safetyAssessment?.factors.fuelAccess.rating || "Good"}
                  </p>
                  <span className="text-[9px] text-muted block">
                    {selectedRoute.safetyAssessment?.factors.fuelAccess.details || `${selectedRoute.fuelStops} fuel plazas along corridor`}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-elevated-surface border border-border space-y-1">
                  <span className="text-[10px] text-muted font-bold flex items-center gap-1">
                    <CloudRain className="h-3 w-3 text-cyan-400" /> Weather Telemetry
                  </span>
                  <p className="font-black text-muted">
                    {selectedRoute.safetyAssessment?.factors.weather.rating || "Not Configured"}
                  </p>
                  <span className="text-[9px] text-muted block truncate" title="Live weather provider not configured">
                    API Not Configured
                  </span>
                </div>
              </div>

              {/* Emergency Access Score Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold text-muted">
                  <span>Emergency Facility Accessibility</span>
                  <span className="text-foreground">{selectedRoute.emergencyAccessScore}/100</span>
                </div>
                <div className="h-2 w-full bg-elevated-surface rounded-full overflow-hidden">
                  <div className="h-full bg-primary-accent rounded-full" style={{ width: `${selectedRoute.emergencyAccessScore}%` }} />
                </div>
              </div>

              {/* Why This Route Explanation */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[10px] font-black text-primary-accent uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Why This Route?
                </span>
                <div className="space-y-1.5">
                  {(selectedRoute.whyThisRoute && selectedRoute.whyThisRoute.length > 0 
                    ? selectedRoute.whyThisRoute 
                    : [selectedRoute.notes]
                  ).map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted font-semibold leading-relaxed">
                      <span className="text-primary-accent font-black">•</span>
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Community Incident Button */}
              <button
                onClick={() => setShowIncidentModal(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-elevated-surface hover:bg-border border border-border text-foreground text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>Report Road Hazard / Incident</span>
              </button>
            </div>

            {/* Selected POI Card */}
            {activePOI && (
              <div className="rounded-3xl border border-primary-accent/40 bg-surface p-5 text-left space-y-3 shadow-md animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-primary-accent uppercase tracking-wider block">
                      VERIFIED GOOGLE PLACE
                    </span>
                    <h4 className="font-black text-sm text-foreground mt-0.5">{activePOI.name}</h4>
                  </div>
                  <button onClick={() => setActivePOI(null)} className="text-muted hover:text-foreground text-xs p-1">✕</button>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted font-semibold">
                  <span className="text-foreground font-bold">{activePOI.distanceAhead}</span>
                  <span>•</span>
                  <span className="text-success font-bold">{activePOI.status}</span>
                </div>
                <div className="text-[10px] text-muted">
                  Source: Google Places along {selectedRoute.name} corridor
                </div>
              </div>
            )}

            {/* Selected Community Incident Card */}
            {activeIncident && (
              <div className="rounded-3xl border border-rose-500/40 bg-surface p-5 text-left space-y-3 shadow-md animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider block">
                      ⚠️ COMMUNITY REPORTED HAZARD
                    </span>
                    <h4 className="font-black text-sm text-foreground mt-0.5">{activeIncident.type}</h4>
                  </div>
                  <button onClick={() => setActiveIncident(null)} className="text-muted hover:text-foreground text-xs p-1">✕</button>
                </div>
                <p className="text-xs text-muted font-semibold leading-relaxed">
                  {activeIncident.description}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-border">
                  <span>Corridor: {activeIncident.corridorName || "Route"}</span>
                  <span>Reported: {new Date(activeIncident.timestamp).toLocaleTimeString()}</span>
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
                    Interactive Mapbox GL service requires your public token. Configure <code className="bg-elevated-surface px-2 py-0.5 rounded text-primary-accent font-mono">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your environment variables.
                  </p>
                  <div className="p-4 rounded-2xl bg-elevated-surface border border-border text-left w-full max-w-md text-xs space-y-1 text-muted">
                    <span className="font-bold text-foreground block">Active Real Google Route:</span>
                    <div className="flex justify-between"><span>Origin:</span> <span className="font-bold text-foreground">{origin.name} ({origin.state})</span></div>
                    <div className="flex justify-between"><span>Destination:</span> <span className="font-bold text-foreground">{dest.name} ({dest.state})</span></div>
                    <div className="flex justify-between"><span>Safety Fit:</span> <span className="font-bold text-success">{selectedRoute.name} ({selectedRoute.safetyScore}/100)</span></div>
                  </div>
                </div>
              ) : (
                <div ref={mapContainer} className="w-full h-full" />
              )}

              {/* Phase 4 Live Navigation Overlay with Phase 5 Safety Check-In */}
              <LiveNavigationOverlay
                status={navStatus}
                activeRoute={navActiveRoute || selectedRoute}
                currentPosition={navPosition}
                progress={navProgress}
                currentManeuver={navCurrentManeuver}
                nextManeuver={navNextManeuver}
                isFollowMode={isFollowMode}
                gpsAccuracyWarning={navGpsAccuracyWarning}
                rerouteProposal={rerouteProposal}
                isRerouting={isRerouting}
                safetyWidget={
                  <SafetyCheckInWidget
                    status={checkInStatus}
                    config={checkInConfig}
                    activeCycle={checkInCycle}
                    secondsRemaining={checkInSecondsRemaining}
                    graceSecondsRemaining={checkInGraceSecondsRemaining}
                    lastKnownSnapshot={checkInLocationSnapshot}
                    escalationResult={checkInEscalationResult}
                    trustedContacts={trustedContacts}
                    onStart={startCheckIn}
                    onConfirmSafe={confirmSafety}
                    onRequestHelp={requestHelp}
                    onCancel={cancelCheckIn}
                  />
                }
                onRecenter={() => {
                  setIsFollowMode(true);
                  if (map.current && navPosition) {
                    map.current.easeTo({
                      center: [navPosition.longitude, navPosition.latitude],
                      zoom: 15,
                      duration: 800
                    });
                  }
                }}
                onEndNavigation={endNavigation}
                onRequestReroute={requestReroute}
                onApproveReroute={approveReroute}
                onRejectReroute={rejectReroute}
              />
              
            </div>

            {/* Route Selector Switcher */}
            <div className={`rounded-2xl border border-border bg-surface p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm ${isOffline ? "opacity-50 pointer-events-none" : ""}`}>
              <span className="text-xs font-black text-muted uppercase tracking-wider">
                Select Alternative Google Route:
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
                    Route {r.id}: {r.name.split(" ")[0]} (Fit: {r.safetyScore}/100)
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Community Incident Report Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 space-y-5 shadow-2xl text-left animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="font-black text-base text-foreground">Report Community Hazard</h3>
              </div>
              <button 
                onClick={() => setShowIncidentModal(false)}
                className="text-muted hover:text-foreground text-xs p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {incidentReportSuccess ? (
              <div className="p-4 rounded-2xl bg-success/15 border border-success/30 text-success text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <p className="font-black text-sm">Hazard Report Logged!</p>
                <p className="text-xs font-semibold">Marked as USER REPORTED along corridor. Route safety fit updated.</p>
              </div>
            ) : (
              <form onSubmit={handleReportHazard} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-muted uppercase tracking-wider block">
                    Incident / Hazard Type
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                    className="w-full rounded-2xl bg-elevated-surface border border-border px-4 py-3 text-xs text-foreground font-bold focus:outline-none focus:border-primary-accent"
                  >
                    <option value="Road blocked">Road blocked / Obstruction</option>
                    <option value="Accident">Accident reported</option>
                    <option value="Heavy traffic">Heavy gridlock / Traffic</option>
                    <option value="Flood / water">Flood / Water logging</option>
                    <option value="Construction">Active road work / Construction</option>
                    <option value="Other">Other road safety issue</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-muted uppercase tracking-wider block">
                    Description & Observations
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the condition (e.g., lane partially closed after toll plaza)..."
                    value={incidentDesc}
                    onChange={(e) => setIncidentDesc(e.target.value)}
                    required
                    className="w-full rounded-2xl bg-elevated-surface border border-border p-3 text-xs text-foreground font-semibold focus:outline-none focus:border-primary-accent"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-elevated-surface border border-border text-[10px] text-muted space-y-1">
                  <span className="font-black text-foreground block">⚠️ Truthful Data Label:</span>
                  <span>Will be published as <strong className="text-warning font-black">USER REPORTED</strong> with a 6-hour automatic validity expiration.</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIncidentModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-elevated-surface hover:bg-border text-muted font-black text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-primary-accent hover:bg-primary-accent-hover text-white font-black text-xs transition-all shadow-md"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Travel Assistant Button */}
      <button
        onClick={() => setShowAssistant(!showAssistant)}
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 p-3.5 rounded-full bg-primary-accent hover:bg-primary-accent-hover text-white shadow-2xl shadow-primary-accent/40 flex items-center gap-2 border-2 border-white/20 transition-transform active:scale-95"
        title="Open AI Travel Guardian Assistant"
      >
        <Bot className="h-6 w-6" />
        <span className="font-black text-xs hidden md:inline">AI Assistant</span>
      </button>

      {/* Floating Travel Assistant Drawer/Modal */}
      {showAssistant && (
        <TravelAssistant
          isOpen={showAssistant}
          isFloating={true}
          onClose={() => setShowAssistant(false)}
          context={liveTravelContext}
          onApplyInterval={(mins) => startCheckIn({ intervalMinutes: mins })}
          onSelectRoute={(id) => {
            const r = allRoutes.find(x => x.id === id);
            if (r) setSelectedRoute(r);
          }}
          onTriggerAlert={() => requestHelp("Assistance requested via AI Assistant.")}
        />
      )}

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

