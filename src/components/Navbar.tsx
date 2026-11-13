"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { calculateMaintenanceStatus } from "@/lib/maintenance";
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
} from "lucide-react";

function MotorsportTelemetryLogo() {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className="w-6 h-6 text-[var(--text-main)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 24.5A11 11 0 1 1 27.5 24.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M11 13.5L12.6 15.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 10V12.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M25 13.5L23.4 15.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 21.5L24.5 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="18" cy="21.5" r="2.4" fill="currentColor" />
      <path
        d="M12.5 26.5H23.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
    </svg>
  );
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [dailyBannerAlert, setDailyBannerAlert] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const vehicleLogs = logs.filter((l) => l.vehicle_id === activeVehicle?.id);
  const latestOdo = Math.max(
    activeVehicle?.initial_odo || 0,
    ...vehicleLogs.map((l) => l.odo_reading || 0),
  );
  const maint = activeVehicle
    ? calculateMaintenanceStatus(activeVehicle, latestOdo)
    : null;
  const hasUnreadAlert = Boolean(maint?.isWashDue || maint?.isServiceDue);

  useEffect(() => {
    if (!user || !activeVehicle || !maint) return;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
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

      setDailyBannerAlert({ title, body });

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(title, { body });
        } catch {
          // Handled by in-app frosted banner
        }
      }
    }
  }, [user, activeVehicle, maint]);

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/logs", label: "Logs", icon: ScrollText },
    { href: "/calculator", label: "Route", icon: MapPin },
    { href: "/garage", label: "Garage", icon: Warehouse },
    { href: "/owner", label: "Owner", icon: User },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--bg-main)]/30 border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Brand Logo + App Name */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-secondary)] backdrop-blur-md border border-[var(--border-color)] flex items-center justify-center shadow-sm">
              <MotorsportTelemetryLogo />
            </div>
            <span className="font-black tracking-tight text-xl leading-none">
              Atlas
            </span>
          </Link>

          {/* Right Controls (Clean & Uncluttered) */}
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                title="Add Entry"
                className="funky-btn-primary p-2 sm:px-3.5 sm:py-2 rounded-full font-extrabold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">Add</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle Theme"
              className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  title="Maintenance Alerts"
                  className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {hasUnreadAlert && (
                    <span
                      aria-label="New notification"
                      className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#0e84eb] ring-2 ring-white/85 dark:ring-[#0b151e] shadow-sm"
                    />
                  )}
                </button>

                {isNotifOpen && maint && (
                  <div className="glass-popover absolute right-0 mt-2.5 w-80 p-4 space-y-3 z-[60] text-xs">
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
                className="funky-btn px-3 py-2 rounded-full bg-[var(--accent-secondary)] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="funky-btn-primary px-3.5 py-2 rounded-full font-extrabold text-xs cursor-pointer"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 24-Hour Fresh Open Theme-Matched Frosted Popup with X Mark */}
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

      {/* Only Show Floating Navigation Dock Once Logged In */}
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
