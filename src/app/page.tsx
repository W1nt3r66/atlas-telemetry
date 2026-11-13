"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { calculateMaintenanceStatus } from "@/lib/maintenance";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gauge,
  Fuel,
  Droplets,
  Wrench,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  LogIn,
  ArrowUpRight,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, signInWithGoogle, activeVehicle, logs, addLog, owner } =
    useApp();
  const [quickBusy, setQuickBusy] = useState<"wash" | "service" | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");

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

  const avgMileage =
    validMileages.length > 0
      ? (
          validMileages.reduce((a, b) => a + b, 0) / validMileages.length
        ).toFixed(2)
      : "0.0";

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

  return (
    <div className="space-y-5">
      {/* Device Clock Greeting */}
      <div className="px-1">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
          {greeting}, {user ? driverFirstName : "Guest"}
        </p>
      </div>

      {/* Compact Sign-In Prompt When Logged Out */}
      {!user && (
        <div className="funky-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-black text-sm">
              Sign in to sync your garage & telemetry
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
      <div className="funky-card p-6 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {activeVehicle
                  ? `${activeVehicle.plate || "NO PLATE"} • ${activeVehicle.fuel_type}`
                  : "NO VEHICLE SELECTED"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              {activeVehicle ? activeVehicle.name : "Atlas Telemetry"}
            </h1>
            <p className="text-xs font-semibold text-[var(--text-muted)]">
              {activeVehicle
                ? `${activeVehicle.manufacturer} • ${owner.fullName || user?.email || "Driver"}`
                : "Sign in with Google or add a vehicle in Garage to begin"}
            </p>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Current Odometer
            </div>
            <div className="text-3xl font-black tabular-nums">
              {latestOdo.toLocaleString()}{" "}
              <span className="text-sm font-bold text-[var(--text-muted)]">
                km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Compact Clickable Telemetry Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href={user ? "/logs?filter=fuel" : "/"}
          className="funky-card funky-card-interactive p-4 space-y-2 block cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-muted)]">
            <span>AVG MILEAGE</span>
            <Gauge className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tabular-nums">
            {avgMileage} <span className="text-xs font-bold">km/l</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Last fill: {latestMileage} km/l
          </div>
        </Link>

        <Link
          href={user ? "/logs?filter=all" : "/"}
          className="funky-card funky-card-interactive p-4 space-y-2 block cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-muted)]">
            <span>THIS MONTH</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tabular-nums">
            ₹{monthlySpend.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Fuel + maintenance
          </div>
        </Link>

        <Link
          href={user ? "/logs?filter=fuel" : "/"}
          className="funky-card funky-card-interactive p-4 space-y-2 block cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-muted)]">
            <span>FUEL LOGGED</span>
            <Fuel className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tabular-nums">
            {totalFuelLiters.toFixed(1)}{" "}
            <span className="text-xs font-bold">L</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {fuelLogs.length} refuels recorded
          </div>
        </Link>

        <Link
          href={user ? "/logs?filter=service" : "/"}
          className="funky-card funky-card-interactive p-4 space-y-2 block cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-extrabold text-[var(--text-muted)]">
            <span>NEXT SERVICE</span>
            <Wrench className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tabular-nums">
            {(maint ? (maint.serviceKmLeft ?? 0) : 0).toLocaleString()}{" "}
            <span className="text-xs font-bold">km</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            or {maint ? (maint.serviceDaysLeft ?? 0) : 0} days left
          </div>
        </Link>
      </div>

      {/* 2 Compact Side-by-Side Care Tiles */}
      <div className="grid grid-cols-2 gap-3.5">
        <div
          onClick={() => user && router.push("/logs?filter=wash")}
          className="funky-card funky-card-interactive p-4 flex flex-col justify-between space-y-2.5 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--text-muted)]">
              <Droplets className="w-3.5 h-3.5 shrink-0" />
              <span className="uppercase tracking-wide">WASH CARE</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] shrink-0">
              {maint
                ? maint.isWashDue
                  ? "Due!"
                  : `${maint.washDaysLeft ?? 0}d left`
                : "0d left"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="text-lg sm:text-xl font-black leading-tight">
              {maint ? maint.seasonLabel : "Seasonal"}
            </div>
            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden border border-[var(--border-color)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                style={{ width: `${washProgressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
              {maint
                ? maint.rustTip
                : "Select a vehicle to track wash schedule."}
            </p>
          </div>

          <button
            type="button"
            disabled={!activeVehicle || quickBusy === "wash"}
            onClick={(e) => handleQuickLog(e, "wash")}
            className="funky-btn w-full py-1.5 px-3 rounded-full bg-[var(--accent-secondary)] text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {quickBusy === "wash" ? "Logging..." : "Washed Today"}
            </span>
          </button>
        </div>

        <div
          onClick={() => user && router.push("/logs?filter=service")}
          className="funky-card funky-card-interactive p-4 flex flex-col justify-between space-y-2.5 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--text-muted)]">
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span className="uppercase tracking-wide">SERVICE</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] shrink-0">
              {maint
                ? maint.isServiceDue
                  ? "Due!"
                  : `${Math.round(serviceProgressPct)}%`
                : "0%"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="text-lg sm:text-xl font-black tabular-nums leading-tight">
              {kmSinceService.toLocaleString()}{" "}
              <span className="text-xs font-bold text-[var(--text-muted)]">
                / {serviceIntervalKm.toLocaleString()} km
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden border border-[var(--border-color)]">
              <div
                className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
                style={{ width: `${serviceProgressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
              Periodic oil, filter & inspection cycle.
            </p>
          </div>

          <button
            type="button"
            disabled={!activeVehicle || quickBusy === "service"}
            onClick={(e) => handleQuickLog(e, "service")}
            className="funky-btn w-full py-1.5 px-3 rounded-full bg-[var(--accent-secondary)] text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {quickBusy === "service" ? "Logging..." : "Service Done"}
            </span>
          </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="funky-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base">Recent Telemetry Logs</h2>
          <Link
            href={user ? "/logs" : "/"}
            title="Open Full Logs"
            aria-label="Open Full Logs"
            className="funky-btn w-8 h-8 rounded-full bg-[var(--accent-secondary)] flex items-center justify-center"
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {vLogs.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4">
            No telemetry logs loaded yet. Sign in with Google or add a new entry
            to get started.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {vLogs.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate">
                    {item.category}{" "}
                    {item.calculated_mileage
                      ? `• ${item.calculated_mileage} km/l`
                      : ""}
                  </div>
                  <div className="text-[var(--text-muted)] truncate">
                    {item.date}{" "}
                    {item.odo_reading
                      ? `• ${item.odo_reading.toLocaleString()} km`
                      : ""}{" "}
                    {item.notes ? `• ${item.notes}` : ""}
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
    </div>
  );
}
