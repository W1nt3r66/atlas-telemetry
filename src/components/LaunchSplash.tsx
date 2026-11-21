"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";

function AtlasLiquidGlassSplashBadge() {
  return (
    <span
      className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl border border-white/50 backdrop-blur-xl saturate-150"
      style={{
        background:
          "radial-gradient(circle at 72% 68%, rgba(162, 198, 228, 0.92) 0%, rgba(124, 166, 204, 0.9) 54%, rgba(98, 142, 184, 0.95) 100%)",
        boxShadow:
          "inset 0 1.5px 2px rgba(255, 255, 255, 0.68), inset 0 -1.5px 3px rgba(255, 255, 255, 0.24), 0 10px 24px rgba(2, 92, 188, 0.28)",
      }}
    >
      {/* Top Curved Glass Highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3.5 -left-2.5 w-[135%] h-[68%] rounded-[100%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.05) 100%)",
        }}
      />

      {/* Soft Bottom Glass Glint */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 bottom-0.5 h-[24%] rounded-b-xl"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      />

      {/* ~70% Coverage 2/3-Circle Translucent Liquid-Glass Arc, Needle & ATLAS */}
      <svg
        width="45"
        height="45"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-[70%] h-[70%]"
      >
        <defs>
          <linearGradient
            id="launchSplashArc"
            x1="7.43"
            y1="5.3"
            x2="28.57"
            y2="23.6"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.84)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.36)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.68)" />
          </linearGradient>

          <linearGradient
            id="launchSplashNeedle"
            x1="18"
            y1="17.5"
            x2="25.9"
            y2="10.4"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.46)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.9)" />
          </linearGradient>
        </defs>

        <path
          d="M7.43 23.6A12.2 12.2 0 1 1 28.57 23.6"
          stroke="url(#launchSplashArc)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        <path
          d="M18 17.5L25.9 10.4"
          stroke="url(#launchSplashNeedle)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        <text
          x="18"
          y="29.2"
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.8)"
          fontSize="4.5"
          fontWeight="800"
          letterSpacing="0.55"
        >
          ATLAS
        </text>
      </svg>
    </span>
  );
}

export default function LaunchSplash() {
  const { authLoading, initialDataLoaded } = useApp();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [initialDismissed, setInitialDismissed] = useState(false);

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

  if (initialDismissed) return null;

  return (
    <div
      style={{ backgroundImage: "var(--bg-gradient)" }}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[var(--bg-main)] transition-opacity duration-400 ${
        readyToHide ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative z-10 flex flex-col items-center gap-3">
        <AtlasLiquidGlassSplashBadge />
        <div className="text-center space-y-0.5">
          <div className="text-3xl font-black tracking-tight text-[var(--text-main)]">
            Atlas
          </div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Telemetry &amp; Garage
          </div>
        </div>
      </div>

      {/* Bottom-to-Top Open-Wheel F1 Car Swoosh */}
      <div
        style={{ transform: "translateY(120vh)", opacity: 0 }}
        className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center animate-vertical-swoosh"
      >
        <svg
          viewBox="0 0 140 240"
          className="w-28 h-48 text-[#025cbc] dark:text-[#3898ec] drop-shadow-[0_-14px_30px_rgba(2,92,188,0.5)] shrink-0"
          fill="currentColor"
        >
          {/* Multi-Element Front Wing & Endplates */}
          <path d="M24 26 L60 18 L80 18 L116 26 L116 37 L82 33 L58 33 L24 37 Z" />
          <rect x="21" y="21" width="4" height="20" rx="1.5" />
          <rect x="115" y="21" width="4" height="20" rx="1.5" />

          {/* Front Suspension Wishbones */}
          <path
            d="M35 54 L63 48 M35 64 L63 62 M105 54 L77 48 M105 64 L77 62"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Front Left & Right Open-Wheel Slick Tires */}
          <rect x="19" y="44" width="17" height="34" rx="5.5" />
          <rect x="104" y="44" width="17" height="34" rx="5.5" />

          {/* Rear Suspension Wishbones */}
          <path
            d="M36 168 L62 162 M36 178 L62 176 M104 168 L78 162 M104 178 L78 176"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Wide Rear Left & Right Open-Wheel Slick Tires */}
          <rect x="16" y="156" width="21" height="38" rx="6" />
          <rect x="103" y="156" width="21" height="38" rx="6" />

          {/* Floor & Bargeboard Aero Edges */}
          <path d="M41 96 L99 96 L95 166 L45 166 Z" fillOpacity="0.45" />

          {/* Main Monocoque Nosecone, Sculpted Sidepods & Tapered Engine Cover */}
          <path d="M70 8 C75 8 78 24 79 44 L81 74 C93 82 97 96 95 118 L88 156 L77 188 L63 188 L52 156 L45 118 C43 96 47 82 59 74 L61 44 C62 24 65 8 70 8 Z" />

          {/* Cockpit Opening & Driver Helmet */}
          <ellipse
            cx="70"
            cy="104"
            rx="8.5"
            ry="15"
            fill="var(--bg-main)"
            fillOpacity="0.9"
          />
          <circle cx="70" cy="105" r="5.5" fill="currentColor" />

          {/* Halo Safety Titanium Wishbone */}
          <path
            d="M61 102 C61 91 79 91 79 102 M70 88 L70 95"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Rear DRS Wing & Endplates */}
          <rect x="33" y="198" width="74" height="14" rx="3" />
          <rect x="30" y="194" width="4" height="22" rx="1.5" />
          <rect x="106" y="194" width="4" height="22" rx="1.5" />
        </svg>

        {/* Smooth Feathered Slipstream Wake (No Hard Horizontal Edge) */}
        <div
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 85%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 18%, black 85%, transparent 100%)",
          }}
          className="-mt-8 w-screen h-[120vh] bg-gradient-to-b from-transparent via-[#0e84eb]/14 to-transparent flex justify-center gap-12 pt-4"
        >
          <div className="w-[2px] h-72 bg-gradient-to-b from-transparent via-[#0e84eb]/65 to-transparent" />
          <div className="w-[3px] h-96 bg-gradient-to-b from-transparent via-[#025cbc]/80 to-transparent" />
          <div className="w-[2px] h-72 bg-gradient-to-b from-transparent via-[#0e84eb]/65 to-transparent" />
        </div>
      </div>
    </div>
  );
}
