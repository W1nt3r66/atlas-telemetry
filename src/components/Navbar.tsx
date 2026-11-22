"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  calculateMaintenanceStatus,
  useLiveWashWeather,
} from "@/lib/maintenance";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import AddEntryModal from "./AddEntryModal";
import {
  LayoutDashboard,
  ScrollText,
  MapPin,
  Warehouse,
  User,
  Plus,
  Sunrise,
  Moon,
  Bell,
  BellRing,
  CheckCircle2,
  LogOut,
  X,
  SlidersHorizontal,
} from "lucide-react";

type F1TeamId =
  | "default"
  | "ferrari"
  | "mercedes"
  | "redbull"
  | "mclaren"
  | "astonmartin";

const F1_TEAMS: { id: F1TeamId; label: string; swatch: string }[] = [
  { id: "default", label: "Atlas", swatch: "#38bdf8" },
  { id: "ferrari", label: "Ferrari", swatch: "#dc0000" },
  { id: "mercedes", label: "Mercedes", swatch: "#00d2be" },
  { id: "redbull", label: "Red Bull", swatch: "#1e41ff" },
  { id: "mclaren", label: "McLaren", swatch: "#ff8000" },
  { id: "astonmartin", label: "Aston Martin", swatch: "#006f62" },
];

const TEAM_STORAGE_KEY = "atlas_f1_team_theme";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function PirelliTyreIcon({ compound }: { compound: "hard" | "soft" }) {
  const sidewallColor = compound === "hard" ? "#e2e8f0" : "#ef4444";
  const rimRingColor = compound === "hard" ? "#94a3b8" : "#dc2626";

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9.2"
        fill="#18181b"
        stroke={sidewallColor}
        strokeWidth="2.6"
      />
      <circle
        cx="12"
        cy="12"
        r="5.2"
        fill="#27272a"
        stroke={rimRingColor}
        strokeWidth="1.2"
      />
      <circle cx="12" cy="12" r="1.9" fill={sidewallColor} />
    </svg>
  );
}

function F1CarLiveryIcon({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      fill="none"
      className="w-4 h-3.5 shrink-0"
      aria-hidden="true"
    >
      {/* Front wing */}
      <rect x="17.5" y="3" width="2.2" height="10" rx="0.8" fill={color} />
      {/* Front wheels */}
      <rect x="14.2" y="1.2" width="3.4" height="2.4" rx="0.8" fill="#18181b" />
      <rect
        x="14.2"
        y="12.4"
        width="3.4"
        height="2.4"
        rx="0.8"
        fill="#18181b"
      />
      {/* Chassis & nose cone */}
      <path
        d="M4.5 6.3L11.5 6.8L18.5 7.5V8.5L11.5 9.2L4.5 9.7V6.3Z"
        fill={color}
      />
      {/* Sidepods */}
      <rect x="7.5" y="4.3" width="5.2" height="7.4" rx="1.6" fill={color} />
      {/* Cockpit / halo */}
      <ellipse cx="11.2" cy="8" rx="1.7" ry="1.2" fill="#09090b" />
      {/* Rear wheels */}
      <rect x="4.8" y="1.2" width="3.6" height="2.6" rx="0.8" fill="#18181b" />
      <rect x="4.8" y="12.2" width="3.6" height="2.6" rx="0.8" fill="#18181b" />
      {/* Rear wing */}
      <rect x="2.2" y="2.6" width="2.2" height="10.8" rx="0.8" fill={color} />
    </svg>
  );
}

async function sendCrossPlatformNotification(
  title: string,
  body: string,
  tag?: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, {
          body,
          icon: "/icon",
          badge: "/icon",
          tag: tag || "atlas-care-alert",
        });
        return;
      }
    }
  } catch {
    // Fallback below for desktop browsers
  }

  try {
    new Notification(title, { body, icon: "/icon" });
  } catch {
    // Mobile browsers require ServiceWorkerRegistration.showNotification
  }
}

function MotorsportTelemetryLogo() {
  return (
    <span
      className="relative w-full h-full rounded-[11px] flex items-center justify-center overflow-hidden backdrop-blur-xl saturate-150"
      style={{
        background:
          "radial-gradient(circle at 72% 68%, rgba(162, 198, 228, 0.92) 0%, rgba(124, 166, 204, 0.9) 54%, rgba(98, 142, 184, 0.95) 100%)",
        boxShadow:
          "inset 0 1.5px 2px rgba(255, 255, 255, 0.68), inset 0 -1.5px 3px rgba(255, 255, 255, 0.24), 0 4px 12px rgba(54, 96, 138, 0.18)",
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-2.5 -left-2 w-[135%] h-[68%] rounded-[100%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.44) 0%, rgba(255, 255, 255, 0.05) 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 bottom-0.5 h-[24%] rounded-b-[10px]"
        style={{
          background:
            "linear-gradient(0deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      />
      <svg
        viewBox="0 0 36 36"
        fill="none"
        className="relative z-10 w-[70%] h-[70%]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="navbarIconArc"
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
            id="navbarIconNeedle"
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
          stroke="url(#navbarIconArc)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path
          d="M18 17.5L25.9 10.4"
          stroke="url(#navbarIconNeedle)"
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

export default function Navbar() {
  const pathname = usePathname();
  const {
    theme,
    toggleTheme,
    user,
    signInWithGoogle,
    activeVehicle,
    logs,
    signOut,
  } = useApp();
  const { enhancedTheme, setThemeMode } = useDashboardTheme();
  const liveWeather = useLiveWashWeather();

  const [f1Team, setF1Team] = useState<F1TeamId>("default");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [isIosBrowserTab, setIsIosBrowserTab] = useState(false);
  const [dailyBannerAlert, setDailyBannerAlert] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const themeMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Register Service Worker for Android Chrome & iOS Home Screen PWA
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent || "";
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    setIsIosBrowserTab(isIos && !isStandalone);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(TEAM_STORAGE_KEY) as F1TeamId | null;
    if (saved && F1_TEAMS.some((t) => t.id === saved)) {
      setF1Team(saved);
      document.documentElement.dataset.f1Team = saved;
    } else {
      document.documentElement.dataset.f1Team = "default";
    }
  }, []);

  const selectF1Team = (teamId: F1TeamId) => {
    setF1Team(teamId);
    localStorage.setItem(TEAM_STORAGE_KEY, teamId);
    document.documentElement.dataset.f1Team = teamId;
  };

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        themeMenuRef.current &&
        target &&
        !themeMenuRef.current.contains(target)
      ) {
        setIsThemeOpen(false);
      }
    };
    if (isThemeOpen) {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isThemeOpen]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        notifMenuRef.current &&
        target &&
        !notifMenuRef.current.contains(target)
      ) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isNotifOpen]);

  const vehicleLogs = logs.filter((l) => l.vehicle_id === activeVehicle?.id);
  const latestOdo = Math.max(
    activeVehicle?.initial_odo || 0,
    ...vehicleLogs.map((l) => l.odo_reading || 0),
  );
  const maint = activeVehicle
    ? calculateMaintenanceStatus(activeVehicle, latestOdo, liveWeather)
    : null;

  const isWashWithin7Days = Boolean(
    maint && (maint.isWashDue || maint.washDaysLeft <= 7),
  );
  const serviceMilestone =
    maint && !maint.isServiceDue
      ? maint.serviceKmLeft <= 100
        ? 100
        : maint.serviceKmLeft <= 200
          ? 200
          : maint.serviceKmLeft <= 500
            ? 500
            : null
      : null;

  const hasUnreadAlert = Boolean(
    maint?.isWashDue ||
    maint?.isServiceDue ||
    isWashWithin7Days ||
    serviceMilestone !== null ||
    notifPermission === "default",
  );

  // User-gesture triggered permission request (required by iOS & Android)
  const handleEnablePhoneAlerts = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);

      if (result === "granted") {
        const vehicleLabel = activeVehicle?.name || "Atlas";
        const body = maint
          ? `Wash in ${maint.washDaysLeft}d • Service in ${maint.serviceKmLeft.toLocaleString()} km`
          : "Phone care alerts are now active on this device.";

        await sendCrossPlatformNotification(
          `${vehicleLabel}: Alerts Enabled`,
          body,
          "atlas-test-alert",
        );
      }
    } catch {
      // Ignore permission errors
    }
  }, [activeVehicle, maint]);

  useEffect(() => {
    if (!user || !activeVehicle || !maint) return;

    // 1) Wash due within 7 days alert (once per 24h)
    if (isWashWithin7Days) {
      const washKey = `atlas_wash7_notif_${user.id}_${activeVehicle.id}`;
      const lastWash = Number(localStorage.getItem(washKey) || 0);
      if (Date.now() - lastWash >= TWENTY_FOUR_HOURS_MS) {
        localStorage.setItem(washKey, String(Date.now()));
        const title = `${activeVehicle.name}: Wash Due Soon (${maint.washDaysLeft}d left)`;
        const body = `Scheduled wash window (${maint.seasonLabel}) is within 7 days.`;
        setDailyBannerAlert({ title, body });
        void sendCrossPlatformNotification(
          title,
          body,
          `atlas-wash-${activeVehicle.id}`,
        );
      }
    }

    // 2) Service 500 / 200 / 100 km threshold alerts (once per milestone per vehicle)
    if (serviceMilestone !== null) {
      const mileKey = `atlas_svc_mile_${user.id}_${activeVehicle.id}_${serviceMilestone}`;
      if (!localStorage.getItem(mileKey)) {
        localStorage.setItem(mileKey, "1");
        const title = `${activeVehicle.name}: Service in ≤${serviceMilestone} km`;
        const body = `${maint.serviceKmLeft.toLocaleString()} km remaining until next service.`;
        setDailyBannerAlert({ title, body });
        void sendCrossPlatformNotification(
          title,
          body,
          `atlas-svc-${activeVehicle.id}-${serviceMilestone}`,
        );
      }
    }

    // 3) Daily check banner (once per 24h)
    const storageKey = `atlas_last_daily_notif_${user.id}`;
    const lastShown = Number(localStorage.getItem(storageKey) || 0);
    const now = Date.now();

    if (now - lastShown >= TWENTY_FOUR_HOURS_MS) {
      localStorage.setItem(storageKey, String(now));

      const title = maint.isServiceDue
        ? `${activeVehicle.name}: Service Interval Reached`
        : maint.isWashDue
          ? `${activeVehicle.name}: Wash Due (${maint.seasonLabel})`
          : `${activeVehicle.name} Daily Care Check`;

      const body = maint.isServiceDue
        ? `Service due now • ${maint.serviceKmLeft.toLocaleString()} km remaining.`
        : `Wash due in ${maint.washDaysLeft}d • Next service in ${maint.serviceKmLeft.toLocaleString()} km.`;

      setDailyBannerAlert((prev) => prev || { title, body });
      void sendCrossPlatformNotification(
        title,
        body,
        `atlas-daily-${activeVehicle.id}`,
      );
    }
  }, [user, activeVehicle, maint, isWashWithin7Days, serviceMilestone]);

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/logs", label: "Logs", icon: ScrollText },
    { href: "/calculator", label: "Route", icon: MapPin },
    { href: "/garage", label: "Garage", icon: Warehouse },
    { href: "/owner", label: "Owner", icon: User },
  ];

  const getSegmentedPillClass = (isActive: boolean) => {
    if (!isActive) {
      return "text-[var(--text-muted)] hover:text-[var(--text-main)]";
    }
    return f1Team === "default" ? "funky-btn-primary" : "team-pill-active";
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--bg-main)]/30 border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center overflow-hidden">
              <MotorsportTelemetryLogo />
            </div>
            <span className="font-black tracking-tight text-xl leading-none">
              Atlas
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                title="Add Entry"
                className="funky-btn-primary h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-full font-extrabold text-[11px] sm:text-xs inline-flex items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                <span>Add</span>
              </button>
            )}

            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsThemeOpen((prev) => !prev);
                  setIsNotifOpen(false);
                }}
                aria-expanded={isThemeOpen}
                title="Theme Settings"
                className="funky-btn h-8 sm:h-9 px-2 sm:px-3 rounded-full bg-[var(--accent-secondary)] font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#025cbc] dark:text-[#60a5fa]" />
                <span className="hidden sm:inline">Theme</span>
              </button>

              {isThemeOpen && (
                <div className="glass-popover fixed right-4 top-16 w-[min(17.5rem,calc(100vw-2rem))] sm:absolute sm:right-0 sm:top-auto sm:mt-2.5 sm:w-72 p-4 space-y-3.5 z-[60] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[var(--text-main)]">
                      Theme
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsThemeOpen(false)}
                      aria-label="Close theme menu"
                      className="funky-btn p-1.5 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* MODE: Light / Dark */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                      Mode
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== "light") toggleTheme();
                        }}
                        className={`py-2 px-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${getSegmentedPillClass(
                          theme === "light",
                        )}`}
                      >
                        <Sunrise className="w-3.5 h-3.5 shrink-0" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== "dark") toggleTheme();
                        }}
                        className={`py-2 px-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${getSegmentedPillClass(
                          theme === "dark",
                        )}`}
                      >
                        <Moon className="w-3.5 h-3.5 shrink-0" />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>

                  {/* COMPOUND: Hard / Soft */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                      Compound
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setThemeMode(true)}
                        className={`py-2 px-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${getSegmentedPillClass(
                          enhancedTheme,
                        )}`}
                      >
                        <PirelliTyreIcon compound="hard" />
                        <span>Hard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode(false)}
                        className={`py-2 px-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${getSegmentedPillClass(
                          !enhancedTheme,
                        )}`}
                      >
                        <PirelliTyreIcon compound="soft" />
                        <span>Soft</span>
                      </button>
                    </div>
                  </div>

                  {/* LIVERY */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                      Livery
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)]">
                      {F1_TEAMS.map((t) => {
                        const active = f1Team === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => selectF1Team(t.id)}
                            className={`funky-btn py-2 px-2.5 rounded-xl font-extrabold flex items-center gap-2 transition cursor-pointer text-left ${
                              active
                                ? getSegmentedPillClass(true)
                                : "bg-white/25 dark:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            }`}
                          >
                            <span
                              data-atlas-swatch={
                                t.id === "default" ? "true" : undefined
                              }
                              className="inline-flex items-center justify-center shrink-0"
                            >
                              <F1CarLiveryIcon color={t.swatch} />
                            </span>
                            <span className="truncate">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="relative" ref={notifMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen((prev) => !prev);
                    setIsThemeOpen(false);
                  }}
                  aria-expanded={isNotifOpen}
                  title="Maintenance Alerts"
                  className="funky-btn h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[var(--accent-secondary)] relative inline-flex items-center justify-center cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {hasUnreadAlert && (
                    <span
                      aria-label="New notification"
                      className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--team-accent)] ring-2 ring-white/85 dark:ring-[#0b151e] shadow-sm"
                    />
                  )}
                </button>

                {isNotifOpen && maint && (
                  <div className="glass-popover fixed right-4 top-16 w-[min(20rem,calc(100vw-2rem))] sm:absolute sm:right-0 sm:top-auto sm:mt-2.5 sm:w-80 p-4 space-y-3 z-[60] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-[var(--text-main)]">
                        Care Alerts
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(false)}
                        className="funky-btn p-1.5 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
                        aria-label="Close alerts"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Phone Notification Permission / Test Controls (iOS & Android) */}
                    {isIosBrowserTab ? (
                      <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                        On iPhone: tap{" "}
                        <strong>Share → Add to Home Screen</strong>, then open
                        Atlas from your Home Screen to enable phone
                        notifications.
                      </div>
                    ) : notifPermission === "granted" ? (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)]">
                        <span className="flex items-center gap-1.5 font-bold text-[11px] text-[var(--text-main)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          Phone Alerts Active
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void sendCrossPlatformNotification(
                              `${activeVehicle?.name || "Atlas"}: Care Summary`,
                              `Wash in ${maint.washDaysLeft}d • Service in ${maint.serviceKmLeft.toLocaleString()} km`,
                              "atlas-manual-test",
                            )
                          }
                          className="funky-btn px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer"
                        >
                          Test Alert
                        </button>
                      </div>
                    ) : notifPermission === "denied" ? (
                      <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Notifications are blocked in your browser/phone settings
                        for Atlas.
                      </div>
                    ) : notifPermission === "default" ? (
                      <button
                        type="button"
                        onClick={() => void handleEnablePhoneAlerts()}
                        className="funky-btn-primary w-full py-2.5 px-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>Enable Phone Alerts (iOS & Android)</span>
                      </button>
                    ) : null}

                    <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)] space-y-1">
                      <div className="font-extrabold text-[var(--text-main)]">
                        Wash Due in {maint.washDaysLeft} days (
                        {maint.seasonLabel})
                      </div>
                      <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                        {maint.rustTip}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-subtle)] space-y-1">
                      <div className="font-extrabold text-[var(--text-main)]">
                        Service Interval (
                        {(
                          activeVehicle?.service_interval_km || 10000
                        ).toLocaleString()}{" "}
                        km)
                      </div>
                      <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
                        {maint.serviceKmLeft.toLocaleString()} km or{" "}
                        {maint.serviceDaysLeft} days left
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <button
                type="button"
                onClick={signOut}
                title={`Sign Out (${user.email})`}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full font-extrabold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition border whitespace-nowrap ${
                  enhancedTheme
                    ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-400/40"
                    : "funky-btn bg-[var(--accent-secondary)]"
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="funky-btn-primary px-3.5 py-2 rounded-full font-extrabold text-xs cursor-pointer whitespace-nowrap"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {user && dailyBannerAlert && (
        <div className="glass-popover fixed top-20 right-4 z-[60] max-w-xs w-[calc(100vw-2rem)] p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="funky-btn-primary w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-black leading-snug text-[var(--text-main)]">
                {dailyBannerAlert.title}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                {dailyBannerAlert.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDailyBannerAlert(null)}
            aria-label="Dismiss notification"
            className="funky-btn p-1.5 rounded-full bg-[var(--accent-secondary)] cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {user && (
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          aria-label="Add Entry"
          title="Add Entry"
          className="funky-btn-primary fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5 stroke-[2.75]" />
        </button>
      )}

      {user && (
        <nav
          aria-label="Primary Navigation"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[305px]"
        >
          <div className="funky-card px-2 py-2 !rounded-full flex items-center justify-between gap-1 shadow-xl">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  className={`w-12 h-10 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? "funky-btn-primary shadow-sm"
                      : "text-[var(--text-main)]/75 hover:text-[var(--text-main)] hover:bg-white/25"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <AddEntryModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </>
  );
}
