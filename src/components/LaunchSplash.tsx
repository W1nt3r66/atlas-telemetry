"use client";

import React, { useEffect, useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { Gauge } from "lucide-react";

export default function LaunchSplash() {
  const { authLoading, initialDataLoaded } = useApp();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [initialDismissed, setInitialDismissed] = useState(false);
  const [pullSwooshKey, setPullSwooshKey] = useState<number | null>(null);

  const touchStartY = useRef<number | null>(null);
  const isPullingFromTop = useRef(false);

  // Initial App Launch Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2050);
    return () => clearTimeout(timer);
  }, []);

  const readyToHide = !authLoading && initialDataLoaded && minTimeElapsed;

  useEffect(() => {
    if (readyToHide) {
      const fadeTimer = setTimeout(() => setInitialDismissed(true), 400);
      return () => clearTimeout(fadeTimer);
    }
  }, [readyToHide]);

  // Global Top-to-Bottom Pull Gesture -> Triggers Bottom-to-Top Car Silhouette Swoosh
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2 && e.touches.length === 1) {
        touchStartY.current = e.touches[0].clientY;
        isPullingFromTop.current = true;
      } else {
        touchStartY.current = null;
        isPullingFromTop.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingFromTop.current || touchStartY.current === null) return;
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 8 && window.scrollY <= 0 && e.cancelable) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isPullingFromTop.current || touchStartY.current === null) return;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      if (deltaY > 75 && window.scrollY <= 2) {
        setPullSwooshKey(Date.now());
      }

      touchStartY.current = null;
      isPullingFromTop.current = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Auto-clear pull-triggered swoosh after animation finishes
  useEffect(() => {
    if (!pullSwooshKey) return;
    const timer = setTimeout(() => {
      setPullSwooshKey(null);
    }, 2150);
    return () => clearTimeout(timer);
  }, [pullSwooshKey]);

  const showInitial = !initialDismissed;
  const showPullSwoosh = pullSwooshKey !== null;

  if (!showInitial && !showPullSwoosh) return null;

  return (
    <>
      {/* Initial Cold-Launch Splash */}
      {showInitial && (
        <div
          style={{ backgroundImage: "var(--bg-gradient)" }}
          className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[var(--bg-main)] transition-opacity duration-400 ${
            readyToHide ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="pointer-events-none absolute w-72 h-72 rounded-full bg-[#0e84eb]/20 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-3 animate-atlas-pop">
            <div
              style={{ background: "var(--accent-primary)" }}
              className="w-16 h-16 rounded-2xl text-white flex items-center justify-center shadow-xl border border-white/50"
            >
              <Gauge className="w-9 h-9" />
            </div>
            <div className="text-center space-y-0.5">
              <div className="text-3xl font-black tracking-tight text-[var(--text-main)]">
                Atlas
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Telemetry &amp; Garage
              </div>
            </div>
          </div>

          <div
            style={{ transform: "translateY(120vh)", opacity: 0 }}
            className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center animate-vertical-swoosh"
          >
            <svg
              viewBox="0 0 120 200"
              className="w-24 h-40 text-[#025cbc] dark:text-[#3898ec] drop-shadow-[0_-12px_28px_rgba(2,92,188,0.45)] shrink-0"
              fill="currentColor"
            >
              <path d="M60 6 C76 6 88 22 92 48 L96 76 C100 84 100 112 96 122 L92 162 C88 180 78 190 60 190 C42 190 32 180 28 162 L24 122 C20 112 20 84 24 76 L28 48 C32 22 44 6 60 6 Z" />
              <path
                d="M60 44 C71 44 78 54 80 72 L76 134 C74 146 68 152 60 152 C52 152 46 146 44 134 L40 72 C42 54 49 44 60 44 Z"
                fill="var(--bg-main)"
                fillOpacity="0.85"
              />
              <rect x="30" y="182" width="60" height="5" rx="2.5" />
            </svg>

            <div className="-mt-6 w-screen h-[140vh] bg-gradient-to-b from-[#0e84eb]/25 via-[var(--bg-main)]/95 to-[var(--bg-main)] backdrop-blur-2xl border-t-2 border-[#0e84eb]/60 flex justify-center gap-12 pt-2">
              <div className="w-[2px] h-72 bg-gradient-to-b from-[#0e84eb] to-transparent opacity-75" />
              <div className="w-[3px] h-96 bg-gradient-to-b from-[#025cbc] to-transparent opacity-90" />
              <div className="w-[2px] h-72 bg-gradient-to-b from-[#0e84eb] to-transparent opacity-75" />
            </div>
          </div>
        </div>
      )}

      {/* Pull-Down Gesture Triggered Silhouette Swoosh (No Reload) */}
      {showPullSwoosh && (
        <div
          key={pullSwooshKey}
          style={{ transform: "translateY(120vh)", opacity: 0 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center animate-vertical-swoosh"
        >
          <svg
            viewBox="0 0 120 200"
            className="w-24 h-40 text-[#025cbc] dark:text-[#3898ec] drop-shadow-[0_-12px_28px_rgba(2,92,188,0.45)] shrink-0"
            fill="currentColor"
          >
            <path d="M60 6 C76 6 88 22 92 48 L96 76 C100 84 100 112 96 122 L92 162 C88 180 78 190 60 190 C42 190 32 180 28 162 L24 122 C20 112 20 84 24 76 L28 48 C32 22 44 6 60 6 Z" />
            <path
              d="M60 44 C71 44 78 54 80 72 L76 134 C74 146 68 152 60 152 C52 152 46 146 44 134 L40 72 C42 54 49 44 60 44 Z"
              fill="var(--bg-main)"
              fillOpacity="0.85"
            />
            <rect x="30" y="182" width="60" height="5" rx="2.5" />
          </svg>

          <div className="-mt-6 w-screen h-[90vh] bg-gradient-to-b from-[#0e84eb]/20 via-[var(--bg-main)]/75 to-transparent backdrop-blur-xl border-t-2 border-[#0e84eb]/55 flex justify-center gap-12 pt-2">
            <div className="w-[2px] h-56 bg-gradient-to-b from-[#0e84eb] to-transparent opacity-70" />
            <div className="w-[3px] h-72 bg-gradient-to-b from-[#025cbc] to-transparent opacity-85" />
            <div className="w-[2px] h-56 bg-gradient-to-b from-[#0e84eb] to-transparent opacity-70" />
          </div>
        </div>
      )}
    </>
  );
}
