"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  swRegistered: boolean;
  updateAvailable: boolean;
  promptInstall: () => Promise<boolean>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

export function usePwaManager(isNavigating: boolean = false, isEmergencyOpen: boolean = false): PwaStatus {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [swRegistered, setSwRegistered] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log("[PWA] Travel Guardian installed successfully.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register Service Worker in production / supported environments
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          setSwRegistered(true);
          console.log("[PWA] Service Worker registered with scope:", reg.scope);

          // Check if there is already a worker waiting
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
          }

          // Listen for update found
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New update is ready and waiting
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                  console.log("[PWA] New Travel Guardian version installed & waiting.");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });

      // Reload smoothly when new Service Worker assumes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Safe install prompt trigger
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("[PWA] Install prompt error:", err);
      return false;
    }
  }, [installPrompt]);

  // Apply update safely
  const applyUpdate = useCallback(() => {
    // NAVIGATION & EMERGENCY SESSION PROTECTION:
    // If active navigation or emergency dialog is open, do not force reload!
    if (isNavigating || isEmergencyOpen) {
      console.warn("[PWA] Update postponed to protect active navigation/emergency session.");
      return;
    }

    if (waitingWorker) {
      waitingWorker.postMessage({ action: "SKIP_WAITING" });
    }
  }, [waitingWorker, isNavigating, isEmergencyOpen]);

  const dismissUpdate = useCallback(() => {
    setUpdateDismissed(true);
  }, []);

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    swRegistered,
    // Do not show update banner if dismissed or if active navigation / emergency is open
    updateAvailable: updateAvailable && !updateDismissed && !isNavigating && !isEmergencyOpen,
    promptInstall,
    applyUpdate,
    dismissUpdate,
  };
}
