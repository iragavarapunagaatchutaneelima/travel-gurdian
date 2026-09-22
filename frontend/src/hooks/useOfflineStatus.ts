"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  NetworkConnectivityStatus, 
  GPSNetworkState, 
  OfflineCorridorPack, 
  CacheFreshness,
  OfflineStorageUsage
} from "../types/offline";
import { 
  listOfflinePacks, 
  getActiveOfflinePack, 
  setActiveOfflinePackId, 
  getPackFreshness, 
  getStorageUsage,
  saveOfflinePack
} from "../services/offlineStorageService";

export function useOfflineStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkConnectivityStatus>("ONLINE");
  const [lastOnlineTimestamp, setLastOnlineTimestamp] = useState<number>(0);
  const [activePack, setActivePack] = useState<OfflineCorridorPack | null>(null);
  const [allPacks, setAllPacks] = useState<OfflineCorridorPack[]>([]);
  const [storageUsage, setStorageUsage] = useState<OfflineStorageUsage>({ totalPacks: 0, estimatedSizeKb: 0, activePackId: null });
  const [gpsAvailable, setGpsAvailable] = useState<boolean>(true);

  // Load initial connectivity and offline packs
  const refreshStorage = useCallback(async () => {
    try {
      const packs = await listOfflinePacks();
      setAllPacks(packs);
      const active = await getActiveOfflinePack();
      setActivePack(active);
      const usage = await getStorageUsage();
      setStorageUsage(usage);
    } catch (err) {
      console.warn("Error loading offline packs storage:", err);
    }
  }, []);

  useEffect(() => {
    setLastOnlineTimestamp(Date.now());
    if (typeof window === "undefined") return;

    // Initial online state
    setNetworkStatus(navigator.onLine ? "ONLINE" : "OFFLINE");
    if (navigator.onLine) {
      setLastOnlineTimestamp(Date.now());
    }

    const handleOnline = () => {
      setNetworkStatus("RECONNECTING");
      setTimeout(() => {
        setNetworkStatus("ONLINE");
        setLastOnlineTimestamp(Date.now());
      }, 800);
    };

    const handleOffline = () => {
      setNetworkStatus("OFFLINE");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    refreshStorage();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshStorage]);

  // Compute composite GPS + Network state
  const gpsNetworkState: GPSNetworkState = 
    gpsAvailable && networkStatus === "ONLINE" ? "GPS_ONLINE_NET_ONLINE" :
    gpsAvailable && networkStatus === "OFFLINE" ? "GPS_ONLINE_NET_OFFLINE" :
    !gpsAvailable && networkStatus === "ONLINE" ? "GPS_OFFLINE_NET_ONLINE" :
    "GPS_OFFLINE_NET_OFFLINE";

  // Compute active pack freshness
  const activePackFreshness: CacheFreshness = activePack ? getPackFreshness(activePack) : "EXPIRED";

  const switchActivePack = useCallback(async (packId: string) => {
    setActiveOfflinePackId(packId);
    await refreshStorage();
  }, [refreshStorage]);

  return {
    networkStatus,
    isOnline: networkStatus === "ONLINE",
    isOffline: networkStatus === "OFFLINE",
    lastOnlineTimestamp,
    gpsAvailable,
    setGpsAvailable,
    gpsNetworkState,
    activePack,
    activePackFreshness,
    allPacks,
    storageUsage,
    refreshStorage,
    switchActivePack
  };
}
