"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { calculateMaintenanceStatus } from "@/lib/maintenance";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Wrench,
  Sparkles,
  CheckCircle2,
  LogIn,
  ArrowUpRight,
  ChevronDown,
  Fuel,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const {
    user,
    signInWithGoogle,
    vehicles,
    activeVehicle,
    setActiveVehicleId,
    logs,
    addLog,
    owner,
  } = useApp();

  const [quickBusy, setQuickBusy] = useState<"wash" | "service" | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good Morning");
      else if (hour < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };
    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, []);

  const cycleVehicle = (direction: "next" | "prev") => {
    if (vehicles.length <= 1 || !activeVehicle) return;
    const currentIndex = vehicles.findIndex((v) => v.id === activeVehicle.id);
    if (currentIndex === -1) return;

    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % vehicles.length
        : (currentIndex - 1 + vehicles.length) % vehicles.length;

    setActiveVehicleId(vehicles[nextIndex].id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (vehicles.length <= 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || vehicles.length <= 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      setSwipeOffset(Math.max(-36, Math.min(36, deltaX * 0.28)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || vehicles.length <= 1) {
      setSwipeOffset(0);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        cycleVehicle("next");
      } else {
        cycleVehicle("prev");
      }
    }

    touchStartRef.current = null;
    setSwipeOffset(0);
  };

  const vLogs = activeVehicle
    ? logs.filter((l) => l.vehicle_id === activeVehicle.id)
    : [];
  const fuelLogs = vLogs.filter((l) => l.type === "fuel");

  const latestOdo = activeVehicle
    ? Math.max(
        activeVehicle.initial_odo || 0,
        ...vLogs.map((l) => l.odo_reading || 0),
      )
    : 0;

  const validMileages = fuelLogs
    .map((l) => l.calculated_mileage)
    .filter((m): m is number => m !== null && m !== undefined && m > 0);

  const avgMileageNum =
    validMileages.length > 0
      ? validMileages.reduce((a, b) => a + b, 0) / validMileages.length
      : 0;

  const avgMileage = avgMileageNum > 0 ? avgMileageNum.toFixed(2) : "0.0";
  const latestMileage =
    validMileages.length > 0 ? validMileages[0].toFixed(2) : "0.0";

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlySpend = vLogs
    .filter((l) => l.date.startsWith(currentMonth))
    .reduce((sum, l) => sum + Number(l.amount), 0);

  const totalFuelLiters = fuelLogs.reduce(
    (sum, l) => sum + Number(l.fuel_liters || 0),
    0,
  );

  const maint = activeVehicle
    ? calculateMaintenanceStatus(activeVehicle, latestOdo)
    : null;

  const serviceIntervalKm = activeVehicle?.service_interval_km || 10000;
  const kmSinceService = activeVehicle
    ? Math.max(
        0,
        latestOdo -
          (activeVehicle.last_service_odo || activeVehicle.initial_odo || 0),
      )
    : 0;

  const washProgressPct =
    maint && maint.washInterval > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((maint.washInterval - maint.washDaysLeft) / maint.washInterval) *
              100,
          ),
        )
      : 0;

  const serviceProgressPct = activeVehicle
    ? Math.min(100, Math.max(0, (kmSinceService / serviceIntervalKm) * 100))
    : 0;

  // SVG Arc Geometry for Efficiency Tachometer (max scale 30 km/l)
  const efficiencyRatio = Math.min(1, Math.max(0, avgMileageNum / 30));
  const arcLength = 157; // semi-circle r=50 -> pi*50
  const arcDashOffset = arcLength * (1 - efficiencyRatio);

  // SVG Ring Geometry for Wash & Service (r=18 -> 2*pi*18 ≈ 113.1)
  const ringCircumference = 113.1;
  const washRingOffset = ringCircumference * (1 - washProgressPct / 100);
  const serviceRingOffset = ringCircumference * (1 - serviceProgressPct / 100);

  const handleQuickLog = async (
    e: React.MouseEvent,
    type: "wash" | "service",
  ) => {
    e.stopPropagation();
    if (!activeVehicle) return;
    setQuickBusy(type);
    const today = new Date().toISOString().split("T")[0];
    await addLog({
      vehicle_id: activeVehicle.id,
      type,
      date: today,
      amount: 0,
      odo_reading: latestOdo,
      category: type === "wash" ? "Wash" : "Service",
      notes: type === "wash" ? "Quick Wash Log" : "Periodic Service Completed",
    });
    setQuickBusy(null);
  };

  const driverFirstName = (
    owner.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Driver"
  ).split(" ")[0];

  const latestLog = vLogs[0] || null;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform:
          swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
      }}
      className="space-y-4 transition-transform duration-200 ease-out"
    >
      {/* Device Clock Greeting & Swipe Pagination Dots */}
      <div className="px-1 flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
          {greeting}, {user ? driverFirstName : "Guest"}
        </p>

        {user && vehicles.length > 1 && (
          <div
            className="flex items-center gap-1.5"
            aria-label="Switch vehicle"
          >
            {vehicles.map((v) => {
              const isCurrent = v.id === activeVehicle?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVehicleId(v.id)}
                  title={`Switch to ${v.name}`}
                  aria-label={`Switch to ${v.name}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    isCurrent
                      ? "w-5 bg-[#025cbc] dark:bg-[#3898ec]"
                      : "w-1.5 bg-[var(--text-muted)]/35 hover:bg-[var(--text-muted)]/60"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Sign-In Prompt When Logged Out */}
      {!user && (
        <div className="funky-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-black text-sm">
              Sign in to sync your garage &amp; telemetry
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Log in with Google to load your vehicles, fuel logs, and mileage
              across devices.
            </p>
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="funky-btn-primary px-4 py-2.5 rounded-full font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign in with Google</span>
          </button>
        </div>
      )}

      {/* Hero Vehicle Banner */}
      <div className="funky-card p-5 sm:p-6 relative overflow-hidden">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] text-[11px] font-extrabold max-w-full">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {activeVehicle
                  ? `${activeVehicle.plate || "NO PLATE"} • ${activeVehicle.fuel_type}`
                  : "NO VEHICLE SELECTED"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none pt-1 truncate">
              {activeVehicle ? activeVehicle.name : "Atlas Telemetry"}
            </h1>
            <p className="text-xs font-semibold text-[var(--text-muted)] truncate">
              {activeVehicle
                ? `${activeVehicle.manufacturer} • ${owner.fullName || user?.email || "Driver"}`
                : "Sign in with Google or add a vehicle in Garage to begin"}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Odometer
            </div>
            <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none">
              {latestOdo.toLocaleString()}{" "}
              <span className="text-xs sm:text-sm font-bold text-[var(--text-muted)]">
                km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Single Cockpit Telemetry Arc & Care Rings Tile */}
      <div className="funky-card p-5 sm:p-6 relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          {/* Left: Semi-Circular Tachometer Efficiency Dial */}
          <Link
            href={user ? "/logs?filter=fuel" : "/"}
            className="sm:col-span-6 flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] hover:brightness-105 transition-all"
          >
            <div className="relative w-44 h-24 flex items-end justify-center">
              <svg
                viewBox="0 0 120 68"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient
                    id="atlasTachGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#3898ec" />
                    <stop offset="100%" stopColor="#025cbc" />
                  </linearGradient>
                </defs>
                {/* Background Track Arc */}
                <path
                  d="M 10 60 A 50 50 0 0 1 110 60"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.14"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Active Efficiency Arc */}
                <path
                  d="M 10 60 A 50 50 0 0 1 110 60"
                  fill="none"
                  stroke="url(#atlasTachGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={arcLength}
                  strokeDashoffset={arcDashOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Readout */}
              <div className="absolute bottom-0 text-center">
                <div className="text-3xl font-black tabular-nums leading-none tracking-tight">
                  {avgMileage}
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)] mt-1">
                  Avg km/l
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] w-full flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] px-1">
              <span>Last: {latestMileage} km/l</span>
              <span className="flex items-center gap-1">
                <Fuel className="w-3 h-3" />
                {totalFuelLiters.toFixed(0)} L
              </span>
            </div>
          </Link>

          {/* Right: Monthly Spend + Radial Wash & Service Rings */}
          <div className="sm:col-span-6 flex flex-col justify-between gap-4">
            {/* Top: Monthly Spend Strip */}
            <Link
              href={user ? "/logs?filter=all" : "/"}
              className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] hover:brightness-105 transition-all"
            >
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  This Month
                </div>
                <div className="text-xs font-semibold text-[var(--text-muted)]">
                  Fuel &amp; care
                </div>
              </div>
              <div className="text-2xl font-black tabular-nums">
                ₹{monthlySpend.toLocaleString()}
              </div>
            </Link>

            {/* Bottom: Dual Circular Care Rings */}
            <div className="grid grid-cols-2 gap-3">
              {/* Wash Ring */}
              <div
                onClick={() => user && router.push("/logs?filter=wash")}
                className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] flex flex-col items-center text-center gap-2 cursor-pointer hover:brightness-105 transition-all"
              >
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.14"
                      strokeWidth="4"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="#0e84eb"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={washRingOffset}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <Droplets className="w-4 h-4 absolute text-[#025cbc] dark:text-[#3898ec]" />
                </div>

                <div>
                  <div className="text-xs font-black leading-tight">
                    {maint
                      ? maint.isWashDue
                        ? "Due!"
                        : `${maint.washDaysLeft}d left`
                      : "Wash"}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] truncate max-w-[95px]">
                    {maint ? maint.seasonLabel : "Wash Care"}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!activeVehicle || quickBusy === "wash"}
                  onClick={(e) => handleQuickLog(e, "wash")}
                  className="funky-btn w-full py-1 px-2 rounded-full bg-white/30 dark:bg-white/10 text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{quickBusy === "wash" ? "..." : "Washed"}</span>
                </button>
              </div>

              {/* Service Ring */}
              <div
                onClick={() => user && router.push("/logs?filter=service")}
                className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] flex flex-col items-center text-center gap-2 cursor-pointer hover:brightness-105 transition-all"
              >
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.14"
                      strokeWidth="4"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="#025cbc"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={serviceRingOffset}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <Wrench className="w-4 h-4 absolute text-[#025cbc] dark:text-[#3898ec]" />
                </div>

                <div>
                  <div className="text-xs font-black tabular-nums leading-tight">
                    {maint
                      ? maint.isServiceDue
                        ? "Due!"
                        : `${(maint.serviceKmLeft ?? 0).toLocaleString()} km`
                      : "Service"}
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)]">
                    Next service
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!activeVehicle || quickBusy === "service"}
                  onClick={(e) => handleQuickLog(e, "service")}
                  className="funky-btn w-full py-1 px-2 rounded-full bg-white/30 dark:bg-white/10 text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{quickBusy === "service" ? "..." : "Serviced"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Recent Logs Dropdown Card */}
      <div className="funky-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLogsExpanded((prev) => !prev)}
            aria-expanded={logsExpanded}
            className="flex-1 flex items-center justify-between gap-2 text-left cursor-pointer py-0.5 min-w-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base">Recent Logs</h2>
                {vLogs.length > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] tabular-nums">
                    {vLogs.length}
                  </span>
                )}
              </div>
              {!logsExpanded && (
                <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  {latestLog
                    ? `Latest: ${latestLog.category} • ${latestLog.date}${
                        latestLog.amount > 0
                          ? ` • ₹${latestLog.amount.toLocaleString()}`
                          : ""
                      }`
                    : "No logs recorded yet"}
                </p>
              )}
            </div>

            <div className="w-7 h-7 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  logsExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          <Link
            href={user ? "/logs" : "/"}
            title="Open Full Logs"
            aria-label="Open Full Logs"
            className="funky-btn w-8 h-8 rounded-full bg-[var(--accent-secondary)] flex items-center justify-center shrink-0"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Expanded Dropdown List */}
        {logsExpanded && (
          <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
            {vLogs.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-3">
                No telemetry logs yet. Tap + in the top bar to log fuel or care.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {vLogs.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold truncate">
                        {item.category}
                        {item.calculated_mileage
                          ? ` • ${item.calculated_mileage} km/l`
                          : ""}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {item.date}
                        {item.odo_reading
                          ? ` • ${item.odo_reading.toLocaleString()} km`
                          : ""}
                      </div>
                    </div>
                    <div className="font-black text-sm tabular-nums shrink-0">
                      {item.amount > 0
                        ? `₹${item.amount.toLocaleString()}`
                        : "Logged"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
