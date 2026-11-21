"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { calculateMaintenanceStatus } from "@/lib/maintenance";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import AddEntryModal from "./AddEntryModal";
import {
  LayoutDashboard,
  ScrollText,
  MapPin,
  Warehouse,
  User,
  Plus,
  Sun,
  Moon,
  Bell,
  LogOut,
  X,
  Palette,
  Layers,
  Flag,
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

  const [f1Team, setF1Team] = useState<F1TeamId>("default");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [dailyBannerAlert, setDailyBannerAlert] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const themeMenuRef = useRef<HTMLDivElement>(null);

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
    const onPointerDown = (e: MouseEvent) => {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(e.target as Node)
      ) {
        setIsThemeOpen(false);
      }
    };
    if (isThemeOpen) {
      document.addEventListener("mousedown", onPointerDown);
    }
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isThemeOpen]);

  const vehicleLogs = logs.filter((l) => l.vehicle_id === activeVehicle?.id);
  const latestOdo = Math.max(
    activeVehicle?.initial_odo || 0,
    ...vehicleLogs.map((l) => l.odo_reading || 0),
  );
  const maint = activeVehicle
    ? calculateMaintenanceStatus(activeVehicle, latestOdo)
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
    serviceMilestone !== null,
  );

  useEffect(() => {
    if (!user || !activeVehicle || !maint) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    const triggerSystemNotif = (title: string, body: string) => {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(title, { body });
        } catch {
          // Handled by banner fallback
        }
      }
    };

    if (isWashWithin7Days) {
      const washKey = `atlas_wash7_notif_${user.id}_${activeVehicle.id}`;
      const lastWash = Number(localStorage.getItem(washKey) || 0);
      if (Date.now() - lastWash >= TWENTY_FOUR_HOURS_MS) {
        localStorage.setItem(washKey, String(Date.now()));
        const title = `${activeVehicle.name}: Wash Due Soon (${maint.washDaysLeft}d left)`;
        const body = `Scheduled wash window (${maint.seasonLabel}) is within 7 days.`;
        setDailyBannerAlert({ title, body });
        triggerSystemNotif(title, body);
      }
    }

    if (serviceMilestone !== null) {
      const mileKey = `atlas_svc_mile_${user.id}_${activeVehicle.id}_${serviceMilestone}`;
      if (!localStorage.getItem(mileKey)) {
        localStorage.setItem(mileKey, "1");
        const title = `${activeVehicle.name}: Service in ≤${serviceMilestone} km`;
        const body = `${maint.serviceKmLeft.toLocaleString()} km remaining until next service.`;
        setDailyBannerAlert({ title, body });
        triggerSystemNotif(title, body);
      }
    }

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
      triggerSystemNotif(title, body);
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

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                title="Add Entry"
                className="funky-btn-primary p-2 sm:px-3.5 sm:py-2 rounded-full font-extrabold text-xs flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Add</span>
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
                className="funky-btn p-2 sm:px-3 sm:py-2 rounded-full bg-[var(--accent-secondary)] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {theme === "light" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--team-accent)]" />
                )}
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
                        <Sun className="w-3.5 h-3.5 shrink-0" />
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
                        <Palette className="w-3.5 h-3.5 shrink-0" />
                        <span>Hard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode(false)}
                        className={`py-2 px-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${getSegmentedPillClass(
                          !enhancedTheme,
                        )}`}
                      >
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>Soft</span>
                      </button>
                    </div>
                  </div>

                  {/* F1 TEAM LIVERY */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                      <Flag className="w-3 h-3" /> F1 Team Livery
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {F1_TEAMS.map((t) => {
                        const active = f1Team === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => selectF1Team(t.id)}
                            style={
                              active
                                ? {
                                    borderColor: t.swatch,
                                    boxShadow: `0 0 0 1px ${t.swatch}`,
                                  }
                                : undefined
                            }
                            className={`py-2 px-2.5 rounded-xl font-extrabold flex items-center gap-2 transition cursor-pointer border text-left ${
                              active
                                ? "bg-white/30 dark:bg-white/15 text-[var(--text-main)]"
                                : "bg-[var(--accent-secondary)]/70 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            }`}
                          >
                            <span
                              data-atlas-swatch={
                                t.id === "default" ? "true" : undefined
                              }
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: t.swatch }}
                            />
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen(!isNotifOpen);
                    setIsThemeOpen(false);
                  }}
                  title="Maintenance Alerts"
                  className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] relative cursor-pointer"
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
                className={`px-3 py-2 rounded-full font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition border whitespace-nowrap ${
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
