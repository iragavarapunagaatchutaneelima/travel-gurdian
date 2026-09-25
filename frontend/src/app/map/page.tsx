"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CITIES, RouteOption, POI, City } from "@/data/routeData";
import { calculateGoogleRoutes } from "@/services/googleRoutes";
import { formatMapErrorMessage, loadGoogleMapsScript } from "@/services/googlePlaces";
import { TravelerProfile, RoutePriority, IncidentReport, IncidentType } from "@/types/safety";
import { LocationDetails } from "@/types/location";
import { getActiveIncidents, reportCommunityIncident } from "@/services/incidentService";
import { useLiveNavigation } from "@/hooks/useLiveNavigation";
import LiveNavigationOverlay from "../components/LiveNavigationOverlay";
import { useSafetyCheckIn } from "@/hooks/useSafetyCheckIn";
import SafetyCheckInWidget from "../components/SafetyCheckInWidget";
import { getTrustedContacts } from "@/services/trustedContactService";
import { TrustedContact } from "@/types/safetyCheckIn";
import { 
  CheckCircle2, Loader, MapPin, 
  Navigation, Crosshair, Layers, ShieldCheck, Fuel, Coffee, 
  AlertCircle, Sparkles, Clock, Compass,
  Download, WifiOff, Check, Loader2, Hospital, ShieldAlert,
  Plus, X, AlertTriangle, Menu, ArrowLeft, PlusSquare, ChevronDown, ChevronUp
} from "lucide-react";
import jsPDF from "jspdf";

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

  const [origin, setOrigin] = useState<City>(() => {
    if (fromLat && fromLng) {
      return {
        id: fromLoc,
        name: fromName || "Origin",
        state: fromAddress || "Selected Location",
        latitude: parseFloat(fromLat),
        longitude: parseFloat(fromLng),
        region: "Selected Location",
        highways: ["Corridor Road"]
      };
    }
    return CITIES[fromLoc.toLowerCase()] || CITIES["chennai"];
  });

  const [dest, setDest] = useState<City>(() => {
    if (destLat && destLng) {
      return {
        id: toLoc,
        name: destName || "Destination",
        state: destAddress || "Selected Location",
        latitude: parseFloat(destLat),
        longitude: parseFloat(destLng),
        region: "Selected Location",
        highways: ["Corridor Road"]
      };
    }
    return CITIES[toLoc.toLowerCase()] || CITIES["bangalore"];
  });

  const [allRoutes, setAllRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Layers Menu & Toggles (Section 11)
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const layersMenuRef = useRef<HTMLDivElement>(null);

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

  // Google Maps references
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const poiMarkersRef = useRef<any[]>([]);
  const incidentMarkersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  
  // GPS Geolocation State for single-shot Locate Button
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Selected POI card
  const [activePOI, setActivePOI] = useState<POI | null>(null);
  const [activeIncident, setActiveIncident] = useState<IncidentReport | null>(null);

  // Offline Pack State
  const [isOffline, setIsOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [offlinePackInfo, setOfflinePackInfo] = useState<any>(null);

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
    cancelCheckIn
  } = useSafetyCheckIn({
    destinationName: dest.name
  });

  // Close layers menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (layersMenuRef.current && !layersMenuRef.current.contains(e.target as Node)) {
        setShowLayersMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowLayersMenu(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Offline network status listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    setTrustedContacts(getTrustedContacts());
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

  // Initialize Google Maps instance with timeout guard to prevent infinite loading (Section 12 & 13)
  useEffect(() => {
    let isCancelled = false;

    if (!mapContainer.current || map.current) return;

    const timeoutTimer = setTimeout(() => {
      if (!isCancelled && !mapLoaded) {
        setMapError("Map initialization timed out. Please check your network connection or reload.");
      }
    }, 9000);

    loadGoogleMapsScript()
      .then(() => {
        if (isCancelled || !mapContainer.current || map.current) return;
        clearTimeout(timeoutTimer);

        const centerLat = (origin.latitude + dest.latitude) / 2;
        const centerLng = (origin.longitude + dest.longitude) / 2;

        const gMap = new window.google.maps.Map(mapContainer.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 7,
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

        gMap.addListener("dragstart", () => {
          setIsFollowMode(false);
        });

        map.current = gMap;
        setMapLoaded(true);
        setMapError(null);
      })
      .catch((err) => {
        if (isCancelled) return;
        clearTimeout(timeoutTimer);
        console.error("Failed to initialize Google Maps:", err);
        setMapError(formatMapErrorMessage(err));
      });

    return () => {
      isCancelled = true;
      clearTimeout(timeoutTimer);
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      if (originMarkerRef.current) {
        originMarkerRef.current.setMap(null);
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.setMap(null);
        destMarkerRef.current = null;
      }
      poiMarkersRef.current.forEach(m => m.setMap(null));
      poiMarkersRef.current = [];
      incidentMarkersRef.current.forEach(m => m.setMap(null));
      incidentMarkersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.setMap(null);
        userCircleRef.current = null;
      }
      map.current = null;
    };
  }, []);

  // Update map type when style toggle changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !window.google?.maps) return;
    map.current.setMapTypeId(
      mapStyle === "satellite" 
        ? window.google.maps.MapTypeId.HYBRID 
        : window.google.maps.MapTypeId.ROADMAP
    );
  }, [mapStyle, mapLoaded]);

  // Load Route Data (Section 6 & 13)
  const loadRoutesData = useCallback(() => {
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
        setRouteError(formatMapErrorMessage(err));
        setRouteLoading(false);
      });
  }, [fromLoc, toLoc, fromName, destName, fromLat, fromLng, destLat, destLng, fromAddress, destAddress, fromPlaceId, destPlaceId, travelMode, profileParam, priorityParam, routeIdParam, startNavParam, startNavigation]);

  useEffect(() => {
    loadRoutesData();
  }, [loadRoutesData]);

  // Render Route Polyline & Origin/Destination Markers on Google Map
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedRoute || !window.google?.maps) return;

    // 1. Draw or Update Route Polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    const path = selectedRoute.waypoints.map(pt => ({
      lat: pt[1],
      lng: pt[0]
    }));

    routePolylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2563FF",
      strokeOpacity: 0.9,
      strokeWeight: 6,
      map: map.current,
      zIndex: 50
    });

    // 2. Origin Marker
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null);
    }
    originMarkerRef.current = new window.google.maps.Marker({
      position: { lat: origin.latitude, lng: origin.longitude },
      map: map.current,
      title: `Origin: ${origin.name}`,
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#2563FF",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 22)
      },
      zIndex: 100
    });

    // 3. Destination Marker
    if (destMarkerRef.current) {
      destMarkerRef.current.setMap(null);
    }
    destMarkerRef.current = new window.google.maps.Marker({
      position: { lat: dest.latitude, lng: dest.longitude },
      map: map.current,
      title: `Destination: ${dest.name}`,
      icon: {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: "#10B981",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 22)
      },
      zIndex: 100
    });

    // 4. Fit bounds to contain route
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: origin.latitude, lng: origin.longitude });
    bounds.extend({ lat: dest.latitude, lng: dest.longitude });
    path.forEach(pt => bounds.extend(pt));
    map.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });

  }, [selectedRoute, origin, dest, mapLoaded]);

  // Update POI & Incident Markers based on Active Layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedRoute || !window.google?.maps) return;

    // Clear existing POI markers
    poiMarkersRef.current.forEach(m => m.setMap(null));
    poiMarkersRef.current = [];

    // Clear incident markers
    incidentMarkersRef.current.forEach(m => m.setMap(null));
    incidentMarkersRef.current = [];

    // Render POIs
    if (selectedRoute.pois && selectedRoute.pois.length > 0) {
      selectedRoute.pois.forEach((poi) => {
        let isVisible = false;
        let color = "#3b82f6";

        if (poi.type === "hospital" && activeLayers.hospitals) {
          isVisible = true;
          color = "#ef4444";
        } else if (poi.type === "police" && activeLayers.police) {
          isVisible = true;
          color = "#2563FF";
        } else if (poi.type === "pharmacy" && activeLayers.pharmacies) {
          isVisible = true;
          color = "#a855f7";
        } else if (poi.type === "petrol" && activeLayers.fuel) {
          isVisible = true;
          color = "#f59e0b";
        } else if ((poi.type === "food" || poi.type === "rest") && activeLayers.rest) {
          isVisible = true;
          color = "#10b981";
        }

        if (isVisible) {
          const marker = new window.google.maps.Marker({
            position: { lat: poi.latitude, lng: poi.longitude },
            map: map.current,
            title: poi.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 1.5
            },
            zIndex: 80
          });

          marker.addListener("click", () => {
            setActivePOI(poi);
            setActiveIncident(null);
            if (map.current) {
              map.current.panTo({ lat: poi.latitude, lng: poi.longitude });
            }
          });

          poiMarkersRef.current.push(marker);
        }
      });
    }

    // Render Incidents / Hazards
    if (activeLayers.incidents && communityIncidents.length > 0) {
      communityIncidents.forEach((inc) => {
        const marker = new window.google.maps.Marker({
          position: { lat: inc.latitude, lng: inc.longitude },
          map: map.current,
          title: `Hazard: ${inc.type}`,
          icon: {
            path: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
            fillColor: "#DC2626",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 1.5,
            scale: 1.1,
            anchor: new window.google.maps.Point(12, 12)
          },
          zIndex: 90
        });

        marker.addListener("click", () => {
          setActiveIncident(inc);
          setActivePOI(null);
          if (map.current) {
            map.current.panTo({ lat: inc.latitude, lng: inc.longitude });
          }
        });

        incidentMarkersRef.current.push(marker);
      });
    }

  }, [selectedRoute, activeLayers, communityIncidents, mapLoaded]);

  // Live GPS User Position Marker update on Google Map
  useEffect(() => {
    if (!map.current || !mapLoaded || !navPosition || !window.google?.maps) return;

    const userLatLng = new window.google.maps.LatLng(navPosition.latitude, navPosition.longitude);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userLatLng);
    } else {
      userMarkerRef.current = new window.google.maps.Marker({
        position: userLatLng,
        map: map.current,
        title: "Your Current Position",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#2563FF",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3
        },
        zIndex: 999
      });
    }

    if (navPosition.accuracy && navPosition.accuracy > 0) {
      if (userCircleRef.current) {
        userCircleRef.current.setCenter(userLatLng);
        userCircleRef.current.setRadius(navPosition.accuracy);
      } else {
        userCircleRef.current = new window.google.maps.Circle({
          strokeColor: "#2563FF",
          strokeOpacity: 0.35,
          strokeWeight: 1,
          fillColor: "#2563FF",
          fillOpacity: 0.12,
          map: map.current,
          center: userLatLng,
          radius: navPosition.accuracy,
          zIndex: 998
        });
      }
    }

    // Follow camera if follow mode is active
    if (isFollowMode && map.current) {
      map.current.panTo(userLatLng);
    }
  }, [navPosition, isFollowMode, mapLoaded]);

  // Report community incident handler
  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    const midIdx = Math.floor(selectedRoute.waypoints.length / 2);
    const midPoint = selectedRoute.waypoints[midIdx] || [origin.longitude, origin.latitude];

    reportCommunityIncident(
      incidentType,
      midPoint[1],
      midPoint[0],
      incidentDesc,
      selectedRoute.id
    );

    const updated = getActiveIncidents();
    setCommunityIncidents(updated);
    setIncidentReportSuccess(true);
    setIncidentDesc("");
    setTimeout(() => {
      setShowIncidentModal(false);
      setIncidentReportSuccess(false);
      loadRoutesData();
    }, 1200);
  };

  // Generate Offline Travel Pack PDF (Section 14)
  const handleDownloadOfflinePack = async () => {
    if (!selectedRoute || !origin || !dest) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const packData = {
        savedAt: new Date().toISOString(),
        routeId: selectedRoute.id,
        route: selectedRoute,
        origin,
        dest
      };
      localStorage.setItem("offline_travel_pack", JSON.stringify(packData));
      setOfflinePackInfo(packData);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42); // slate dark
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("TRAVEL GUARDIAN", 15, 20);
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184); // muted
      doc.text("OFFLINE SURVIVAL TRAVEL PACK", 15, 30);

      // Route Info
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text("ROUTE DETAILS", 15, 55);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`${origin.name} to ${dest.name}`, 15, 65);
      doc.setFontSize(12);
      doc.text(`Travel Mode: ${travelMode}`, 15, 73);
      doc.text(`Corridor: ${selectedRoute.name}`, 15, 80);
      
      let curY = 95;
      doc.setFont("helvetica", "bold");
      doc.text("CORRIDOR SAFETY INTELLIGENCE", 15, curY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Distance: ${selectedRoute.distance}`, 15, curY + 8);
      doc.text(`Est. Travel Time: ${selectedRoute.time}`, 15, curY + 15);
      doc.text(`Safety Score: ${selectedRoute.safetyScore}/100`, 15, curY + 22);
      doc.text(`Traffic: ${selectedRoute.trafficScore}`, 15, curY + 29);
      doc.text(`Road Quality: ${selectedRoute.roadScore}`, 15, curY + 36);
      
      doc.text(`Emergency Access: ${selectedRoute.emergencyAccessScore}/100`, pageWidth / 2, curY + 8);
      doc.text(`Fuel Stops: ${selectedRoute.fuelStops}`, pageWidth / 2, curY + 15);
      doc.text(`Rest & Food: ${selectedRoute.restStops}`, pageWidth / 2, curY + 22);
      doc.text(`Toll Status: ${selectedRoute.tollInfo || "No Tolls"}`, pageWidth / 2, curY + 29);
      
      curY += 50;

      // Emergency Contacts & Hotlines
      doc.setFillColor(254, 242, 242);
      doc.rect(15, curY, pageWidth - 30, 32, "F");
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("EMERGENCY HOTLINES & PROTOCOL", 20, curY + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("• National Emergency Service: 112 (Police, Fire, Ambulance)", 20, curY + 18);
      doc.text("• Highway Trauma / Medical Emergency: 108", 20, curY + 25);

      curY += 45;

      // Safe Havens
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("VERIFIED SAFE HAVENS ALONG CORRIDOR", 15, curY);
      curY += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      if (selectedRoute.pois && selectedRoute.pois.length > 0) {
        selectedRoute.pois.slice(0, 10).forEach((poi) => {
          if (curY > 270) {
            doc.addPage();
            curY = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.text(poi.name, 15, curY);
          doc.setFont("helvetica", "normal");
          doc.text(`Category: ${poi.type.toUpperCase()} | Location: ${poi.distanceAhead} | Status: ${poi.status}`, 15, curY + 5);
          curY += 12;
        });
      } else {
        doc.text("All regional emergency facilities accessible via National Hotline 112.", 15, curY);
        curY += 10;
      }

      doc.save(`Travel_Guardian_Offline_Pack_${selectedRoute.name.replace(/\s+/g, '_')}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (error) {
      console.error("PDF generation failed:", error);
      setRouteError("Failed to generate offline survival pack. Please check browser storage.");
    } finally {
      setIsDownloading(false);
    }
  };

  // GPS Geolocation Handler
  const handleShowMyLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsLoading(false);

        if (map.current && window.google?.maps) {
          const userLatLng = new window.google.maps.LatLng(latitude, longitude);
          map.current.panTo(userLatLng);
          map.current.setZoom(15);

          if (!userMarkerRef.current) {
            userMarkerRef.current = new window.google.maps.Marker({
              position: userLatLng,
              map: map.current,
              title: "Your Location",
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#2563FF",
                fillOpacity: 1,
                strokeColor: "#FFFFFF",
                strokeWeight: 3
              },
              zIndex: 999
            });
          } else {
            userMarkerRef.current.setPosition(userLatLng);
          }
        }
      },
      (error) => {
        setGpsLoading(false);
        setGpsError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Please allow location access."
            : "Unable to retrieve current GPS location."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div 
      className="h-dvh flex flex-col overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Header />

      {/* Main Viewport Map Container (Section 10: Map occupies most of viewport) */}
      <main className="flex-1 min-h-0 relative w-full overflow-hidden flex flex-col">
        
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-600 text-white text-[11px] py-1 px-4 text-center font-bold tracking-wide flex items-center justify-center gap-2 shrink-0 z-30 shadow-sm">
            <WifiOff className="h-3.5 w-3.5" />
            <span>OFFLINE MODE — USING LOCALLY SAVED TRAVEL PACK DATA</span>
          </div>
        )}

        {/* The Google Maps Canvas */}
        <div ref={mapContainer} className="w-full h-full relative" />

        {/* Loading State Overlay */}
        {(routeLoading || (!mapLoaded && !mapError)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-(--background)/85 backdrop-blur-md z-40 animate-fadeIn">
            <div className="p-4 rounded-3xl bg-(--primary)/10 text-(--primary) mb-3 border border-(--primary)/20 shadow-md">
              <Loader2 className="h-9 w-9 animate-spin" />
            </div>
            <h3 className="text-base font-extrabold text-foreground">Connecting Google Maps Corridor...</h3>
            <p className="text-xs text-(--muted-foreground) mt-1 max-w-sm">
              Calculating real road geometry and verifying safe haven facilities along your corridor.
            </p>
          </div>
        )}

        {/* Error State Overlay (Never stuck in Loading, Section 12) */}
        {(mapError || routeError) && !routeLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-(--background)/95 backdrop-blur-md z-40">
            <div className="p-4 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3 border border-amber-500/20">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Map Service Notice</h3>
            <p className="text-xs text-(--muted-foreground) max-w-md mt-1 mb-4 leading-relaxed">
              {mapError || routeError}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setMapError(null);
                  setRouteError(null);
                  loadRoutesData();
                }}
                className="px-4 py-2.5 rounded-xl bg-(--primary) text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
              >
                Retry Route
              </button>
              <button
                onClick={() => router.push("/plan")}
                className="px-4 py-2.5 rounded-xl bg-elevated-surface text-foreground border border-border text-xs font-bold hover:bg-surface transition-colors"
              >
                Back to Plan
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            FLOATING CONTROLS: TOP-LEFT HEADER CHIP
            ============================================================ */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[85vw] sm:max-w-md pointer-events-none">
          <div className="p-3 rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border shadow-lg text-left pointer-events-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => router.push("/plan")}
                className="p-1.5 rounded-xl hover:bg-elevated-surface text-(--muted-foreground) transition-colors"
                title="Back to Journey Planner"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider">
                    {selectedRoute ? selectedRoute.name : "Google Road Corridor"}
                  </span>
                  {selectedRoute && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Fit: {selectedRoute.safetyScore}/100
                    </span>
                  )}
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-foreground truncate mt-0.5">
                  {origin.name} ➔ {dest.name}
                </h2>
                {selectedRoute && (
                  <p className="text-[10px] text-(--muted-foreground) font-medium">
                    {travelMode} • {selectedRoute.distance} • {selectedRoute.time}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowDetailsPanel(v => !v)}
              className="p-1.5 rounded-xl bg-elevated-surface text-foreground border border-border shrink-0 hover:bg-surface transition-colors"
              title="Toggle Route Summary"
            >
              {showDetailsPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Expandable Details Drawer */}
          {showDetailsPanel && selectedRoute && (
            <div className="p-4 rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border shadow-xl text-left pointer-events-auto text-xs space-y-2.5 animate-slideDown">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border text-[11px]">
                <div>
                  <span className="text-[10px] text-(--muted-foreground) font-semibold block">Emergency Access</span>
                  <span className="font-bold text-foreground">{selectedRoute.emergencyAccessScore}/100</span>
                </div>
                <div>
                  <span className="text-[10px] text-(--muted-foreground) font-semibold block">Toll Info</span>
                  <span className="font-bold text-foreground">{selectedRoute.tollInfo || "Standard Highway"}</span>
                </div>
              </div>
              <p className="text-[11px] text-(--muted-foreground) leading-relaxed">
                {selectedRoute.notes}
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                >
                  + Report Hazard
                </button>
                <button
                  onClick={handleDownloadOfflinePack}
                  disabled={isDownloading}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-(--primary) bg-(--primary)/10 hover:bg-(--primary)/20 border border-(--primary)/30 transition-all flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  <span>{isDownloading ? "Saving..." : downloadSuccess ? "Downloaded" : "Offline Pack"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            FLOATING CONTROLS: TOP-RIGHT (Section 11: Compact ☰ Layers Menu)
            ============================================================ */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
          
          {/* Map style toggle (Street vs Satellite) */}
          <div className="flex items-center rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border p-1 shadow-md">
            <button
              onClick={() => setMapStyle("streets")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mapStyle === "streets" 
                  ? "bg-(--primary) text-white shadow-sm" 
                  : "text-(--muted-foreground) hover:text-foreground"
              }`}
            >
              Street
            </button>
            <button
              onClick={() => setMapStyle("satellite")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mapStyle === "satellite" 
                  ? "bg-(--primary) text-white shadow-sm" 
                  : "text-(--muted-foreground) hover:text-foreground"
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Locate Me button */}
          <button
            onClick={handleShowMyLocation}
            disabled={gpsLoading}
            className="p-2.5 rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border text-(--primary) hover:bg-elevated-surface shadow-md transition-all active:scale-95 disabled:opacity-50"
            title="Locate Current Position"
            aria-label="Locate Current Position"
          >
            {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          </button>

          {/* Compact ☰ Layers Menu Button (Section 11) */}
          <div className="relative" ref={layersMenuRef}>
            <button
              onClick={() => setShowLayersMenu(prev => !prev)}
              className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-md transition-all flex items-center gap-1.5 active:scale-95 ${
                showLayersMenu 
                  ? "bg-(--primary) text-white border-(--primary)" 
                  : "bg-(--surface)/95 text-foreground border-border hover:bg-elevated-surface"
              }`}
              title="Map Safety Layers"
              aria-label="Toggle map layers menu"
              aria-expanded={showLayersMenu}
            >
              <Menu className="h-4 w-4" />
              <span className="text-xs font-bold hidden sm:inline">Layers</span>
            </button>

            {/* Clean Layers Dropdown Menu */}
            {showLayersMenu && (
              <div 
                className="absolute right-0 top-12 w-64 p-3.5 rounded-3xl bg-(--surface)/95 backdrop-blur-md border border-border shadow-2xl z-50 text-left space-y-2 animate-slideDown"
                role="menu"
                aria-label="Safety layers options"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-[10px] font-black uppercase tracking-wider text-(--muted-foreground)">
                    Corridor Safety Layers
                  </span>
                  <button
                    onClick={() => setShowLayersMenu(false)}
                    className="p-1 rounded-lg text-(--muted-foreground) hover:bg-elevated-surface"
                    aria-label="Close layers menu"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {[
                    { key: "hospitals", label: "Hospitals", icon: Hospital, count: selectedRoute?.pois?.filter(p => p.type === "hospital").length || 0, color: "text-red-500", bg: "bg-red-500/10" },
                    { key: "police", label: "Police", icon: ShieldAlert, count: selectedRoute?.pois?.filter(p => p.type === "police").length || 0, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { key: "pharmacies", label: "Pharmacies", icon: PlusSquare, count: selectedRoute?.pois?.filter(p => p.type === "pharmacy").length || 0, color: "text-purple-500", bg: "bg-purple-500/10" },
                    { key: "fuel", label: "Fuel", icon: Fuel, count: selectedRoute?.pois?.filter(p => p.type === "petrol").length || 0, color: "text-amber-500", bg: "bg-amber-500/10" },
                    { key: "rest", label: "Food & Rest", icon: Coffee, count: selectedRoute?.pois?.filter(p => p.type === "food" || p.type === "rest").length || 0, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { key: "incidents", label: "Hazards", icon: AlertTriangle, count: communityIncidents.length, color: "text-rose-500", bg: "bg-rose-500/10" },
                  ].map((layer) => {
                    const Icon = layer.icon;
                    const isChecked = activeLayers[layer.key as keyof typeof activeLayers];
                    return (
                      <label
                        key={layer.key}
                        className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-colors text-xs font-semibold ${
                          isChecked ? "bg-elevated-surface text-foreground" : "text-(--muted-foreground) hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-xl ${layer.bg} ${layer.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span>{layer.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-(--muted-foreground)">
                            ({layer.count})
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setActiveLayers(prev => ({
                              ...prev,
                              [layer.key]: !prev[layer.key as keyof typeof activeLayers]
                            }))}
                            className="rounded accent-(--primary) h-4 w-4 cursor-pointer"
                          />
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border flex justify-between items-center text-[10px] text-(--muted-foreground)">
                  <span>Toggle pins visibility</span>
                  <button
                    onClick={() => setActiveLayers({
                      hospitals: true,
                      police: true,
                      pharmacies: true,
                      fuel: true,
                      rest: true,
                      incidents: true
                    })}
                    className="font-bold text-(--primary) hover:underline"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* GPS Error Notification */}
        {gpsError && (
          <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md z-30 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
            <button onClick={() => setGpsError(null)} className="p-1 hover:opacity-70">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Selected POI Card */}
        {activePOI && (
          <div className="absolute bottom-20 left-3 right-3 sm:left-4 sm:right-auto sm:w-80 p-4 rounded-3xl bg-(--surface)/95 backdrop-blur-md border border-border shadow-xl z-20 text-left space-y-2 animate-slideUp">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-(--primary)/10 text-(--primary)">
                  {activePOI.type === "hospital" && <Hospital className="h-4 w-4 text-red-500" />}
                  {activePOI.type === "police" && <ShieldAlert className="h-4 w-4 text-blue-500" />}
                  {activePOI.type === "pharmacy" && <PlusSquare className="h-4 w-4 text-purple-500" />}
                  {activePOI.type === "petrol" && <Fuel className="h-4 w-4 text-amber-500" />}
                  {(activePOI.type === "food" || activePOI.type === "rest") && <Coffee className="h-4 w-4 text-emerald-500" />}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-foreground">{activePOI.name}</h4>
                  <span className="text-[10px] font-semibold text-(--muted-foreground) capitalize">{activePOI.type}</span>
                </div>
              </div>
              <button onClick={() => setActivePOI(null)} className="p-1 text-(--muted-foreground) hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-(--muted-foreground)">{activePOI.distanceAhead}</p>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {activePOI.status}
              </span>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activePOI.latitude},${activePOI.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-(--primary) hover:underline flex items-center gap-1"
              >
                <span>Navigate</span>
                <Navigation className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Selected Incident / Hazard Card */}
        {activeIncident && (
          <div className="absolute bottom-20 left-3 right-3 sm:left-4 sm:right-auto sm:w-80 p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/90 backdrop-blur-md border border-rose-300 dark:border-rose-800 shadow-xl z-20 text-left space-y-2 animate-slideUp text-rose-900 dark:text-rose-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">{activeIncident.type}</h4>
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">Community Hazard Report</span>
                </div>
              </div>
              <button onClick={() => setActiveIncident(null)} className="p-1 text-rose-700 dark:text-rose-300 hover:opacity-70">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed">{activeIncident.description || "Active caution reported along this road corridor."}</p>
            <span className="text-[9px] text-rose-600 dark:text-rose-400 block pt-1">
              Reported: {new Date(activeIncident.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* ============================================================
            FLOATING BOTTOM BAR: CONTROLS & NAVIGATION LAUNCHER
            ============================================================ */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-none">
          
          {/* Alternative Route Switcher (Left) */}
          {allRoutes.length > 1 && (
            <div className="p-1.5 rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border shadow-lg flex items-center gap-1.5 pointer-events-auto">
              <span className="text-[10px] font-black uppercase text-(--muted-foreground) px-2 hidden sm:inline">
                Corridors:
              </span>
              {allRoutes.map((r) => {
                const isSelected = selectedRoute?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoute(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      isSelected 
                        ? "bg-(--primary) text-white shadow-sm" 
                        : "bg-elevated-surface text-foreground hover:bg-surface border border-border"
                    }`}
                  >
                    Route {r.id} ({r.safetyScore})
                  </button>
                );
              })}
            </div>
          )}

          {/* Core Action: START LIVE NAVIGATION (Center/Right) */}
          <div className="flex items-center gap-2 pointer-events-auto w-full sm:w-auto">
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-3.5 py-3 rounded-2xl bg-(--surface)/95 backdrop-blur-md border border-border hover:bg-elevated-surface text-foreground font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              title="Report road hazard"
            >
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="hidden sm:inline">Report Hazard</span>
            </button>

            <button
              onClick={startNavigation}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Navigation className="h-4 w-4 fill-white" />
              <span>START LIVE NAVIGATION</span>
            </button>
          </div>

        </div>

        {/* Phase 4 Live Navigation Overlay with Phase 5 Safety Check-In */}
        <LiveNavigationOverlay
          status={navStatus}
          activeRoute={(navActiveRoute || selectedRoute || allRoutes[0]) as RouteOption}
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
            if (map.current && navPosition && window.google?.maps) {
              map.current.panTo({ lat: navPosition.latitude, lng: navPosition.longitude });
              map.current.setZoom(16);
            }
          }}
          onEndNavigation={endNavigation}
          onRequestReroute={requestReroute}
          onApproveReroute={approveReroute}
          onRejectReroute={rejectReroute}
        />

        {/* Incident Reporting Modal */}
        {showIncidentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl p-6 bg-surface border border-border shadow-2xl text-left space-y-4 animate-slideUp">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-foreground">Report Road Hazard</h3>
                    <p className="text-[10px] text-(--muted-foreground)">Alert fellow travelers on this corridor</p>
                  </div>
                </div>
                <button onClick={() => setShowIncidentModal(false)} className="p-1 rounded-lg text-(--muted-foreground) hover:bg-elevated-surface">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {incidentReportSuccess ? (
                <div className="py-6 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-foreground">Hazard Reported!</h4>
                  <p className="text-xs text-(--muted-foreground)">Corridor safety fit is updating automatically.</p>
                </div>
              ) : (
                <form onSubmit={handleReportIncident} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-(--muted-foreground) uppercase">Hazard Type</label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                      className="w-full p-3 rounded-xl bg-elevated-surface border border-border text-xs font-semibold text-foreground outline-none"
                    >
                      <option value="Road blocked">Road Blocked / Tree Fall</option>
                      <option value="Accident">Accident Ahead</option>
                      <option value="Severe Weather">Severe Waterlogging / Fog</option>
                      <option value="Unlit Area">Dangerously Dark Stretch</option>
                      <option value="Suspicious Activity">Suspicious Activity / Checkpoint</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-(--muted-foreground) uppercase">Details (Optional)</label>
                    <textarea
                      value={incidentDesc}
                      onChange={(e) => setIncidentDesc(e.target.value)}
                      placeholder="e.g., Highway right lane blocked near toll plaza..."
                      rows={3}
                      className="w-full p-3 rounded-xl bg-elevated-surface border border-border text-xs text-foreground outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setShowIncidentModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-(--muted-foreground) hover:bg-elevated-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Broadcast Hazard
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

export default function LivingMapScreen() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-(--primary)" />
      </div>
    }>
      <LivingMapContent />
    </Suspense>
  );
}
