"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "atlas_color_ui_enabled";
const SYNC_EVENT = "atlas:color-ui-change";

export function useDashboardTheme() {
  const [enhancedTheme, setEnhancedTheme] = useState<boolean>(true);

  useEffect(() => {
    const readPreference = () => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === null) {
          setEnhancedTheme(true);
        } else {
          setEnhancedTheme(stored === "true");
        }
      } catch {
        setEnhancedTheme(true);
      }
    };

    readPreference();

    const onCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setEnhancedTheme(detail.enabled);
      } else {
        readPreference();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        readPreference();
      }
    };

    window.addEventListener(SYNC_EVENT, onCustomEvent);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SYNC_EVENT, onCustomEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setThemeMode = useCallback((enabled: boolean) => {
    setEnhancedTheme(enabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT, { detail: { enabled } }),
      );
    } catch {
      // ignore storage quota/privacy errors
    }
  }, []);

  const toggleColorUi = useCallback(() => {
    setThemeMode(!enhancedTheme);
  }, [enhancedTheme, setThemeMode]);

  return {
    enhancedTheme,
    setThemeMode,
    toggleColorUi,
  };
}
