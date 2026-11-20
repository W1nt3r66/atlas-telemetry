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
  Trash2,
  X,
  ShieldCheck,
  Gauge,
} from "lucide-react";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function getLocalDateString(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getRenewalCountdown(dateStr?: string) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formattedDate = target.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (diffDays < 0) {
    return {
      statusLabel: `Expired ${Math.abs(diffDays)}d ago`,
      formattedDate,
      tone: "danger" as const,
    };
  }
  if (diffDays === 0) {
    return {
      statusLabel: "Expires Today",
      formattedDate,
      tone: "danger" as const,
    };
  }
  if (diffDays <= 30) {
    return {
      statusLabel: `${diffDays}d left`,
      formattedDate,
      tone: "warning" as const,
    };
  }
  return {
    statusLabel: `${diffDays}d left`,
    formattedDate,
    tone: "ok" as const,
  };
}

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
    deleteLog,
    owner,
  } = useApp();

  const [quickModalType, setQuickModalType] = useState<
    "wash" | "service" | null
  >(null);
  const [quickDate, setQuickDate] = useState<string>(() =>
    getLocalDateString(0),
  );
  const [quickOdo, setQuickOdo] = useState<string>("");
  const [quickBusy, setQuickBusy] = useState(false);

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

  // Cost-Per-Kilometer & Ownership Economics
  const totalFuelSpend = fuelLogs.reduce(
    (sum, l) => sum + Number(l.amount || 0),
    0,
  );
  const totalAllSpend = vLogs.reduce(
    (sum, l) => sum + Number(l.amount || 0),
    0,
  );
  const nonFuelSpend = Math.max(0, totalAllSpend - totalFuelSpend);

  const baselineOdo = activeVehicle?.initial_odo || 0;
  const trackedDistance =
    latestOdo > baselineOdo ? latestOdo - baselineOdo : latestOdo;

  const fuelCostPerKm =
    trackedDistance > 0 ? totalFuelSpend / trackedDistance : 0;
  const allInCostPerKm =
    trackedDistance > 0 ? totalAllSpend / trackedDistance : 0;
  const fuelShareOfCostPct =
    totalAllSpend > 0 ? Math.round((totalFuelSpend / totalAllSpend) * 100) : 0;

  // Compliance & Renewal Dates
  const renewalItems = [
    {
      label: "Insurance",
      info: getRenewalCountdown(activeVehicle?.insurance_expiry),
    },
    {
      label: "PUC",
      info: getRenewalCountdown(activeVehicle?.puc_expiry),
    },
    {
      label: "RC / Fitness",
      info: getRenewalCountdown(activeVehicle?.rc_expiry),
    },
  ];

  const maint = activeVehicle
    ? calculateMaintenanceStatus(activeVehicle, latestOdo)
    : null;

  const serviceIntervalKm = activeVehicle?.service_interval_km || 10000;
  const baseServiceOdo =
    activeVehicle?.last_service_odo || activeVehicle?.initial_odo || 0;
  const nextServiceTargetOdo = baseServiceOdo + serviceIntervalKm;
  const kmSinceService = activeVehicle
    ? Math.max(0, latestOdo - baseServiceOdo)
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

  // Analog Sport Instrument Cluster Geometry (220° Sweep: -110° to +110°, 0 to 30 km/l)
  const dialCx = 110;
  const dialCy = 92;
  const startAngle = -110;
  const endAngle = 110;
  const totalSweep = endAngle - startAngle;
  const efficiencyRatio = Math.min(1, Math.max(0, avgMileageNum / 30));
  const currentNeedleAngle = startAngle + efficiencyRatio * totalSweep;

  const outerTickR = 82;
  const majorTickInnerR = 73;
  const minorTickInnerR = 77;
  const labelR = 62;
  const innerArcR = 48;

  const trackArcPath = describeArc(
    dialCx,
    dialCy,
    innerArcR,
    startAngle,
    endAngle,
  );
  const activeArcPath =
    efficiencyRatio > 0.005
      ? describeArc(
          dialCx,
          dialCy,
          innerArcR,
          startAngle,
          Math.max(startAngle + 1, currentNeedleAngle),
        )
      : "";

  const needleTip = polarToCartesian(
    dialCx,
    dialCy,
    outerTickR - 2,
    currentNeedleAngle,
  );
  const needleBase = polarToCartesian(
    dialCx,
    dialCy,
    innerArcR - 10,
    currentNeedleAngle,
  );

  const ringCircumference = 113.1;
  const washRingOffset = ringCircumference * (1 - washProgressPct / 100);
  const serviceRingOffset = ringCircumference * (1 - serviceProgressPct / 100);

  const openQuickCareModal = (
    e: React.MouseEvent,
    type: "wash" | "service",
  ) => {
    e.stopPropagation();
    if (!activeVehicle) return;
    setQuickDate(getLocalDateString(0));
    setQuickOdo(latestOdo > 0 ? String(latestOdo) : "");
    setQuickModalType(type);
  };

  const handleConfirmQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle || !quickModalType || quickBusy) return;

    setQuickBusy(true);
    const parsedOdo = quickOdo ? Math.max(0, Number(quickOdo)) : latestOdo;

    await addLog({
      vehicle_id: activeVehicle.id,
      type: quickModalType,
      date: quickDate || getLocalDateString(0),
      amount: 0,
      odo_reading: parsedOdo || null,
      category: quickModalType === "wash" ? "Wash" : "Service",
      notes:
        quickModalType === "wash"
          ? "Vehicle Wash"
          : "Periodic Service Completed",
    });

    setQuickBusy(false);
    setQuickModalType(null);
  };

  const handleDeleteRecent = async (id: string, label: string) => {
    if (!confirm(`Delete "${label}" log?`)) return;
    await deleteLog(id);
  };

  const driverFirstName = (
    owner.fullName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Driver"
  ).split(" ")[0];

  const latestLog = vLogs[0] || null;

  return (
    <>
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
                    ? `${activeVehicle.plate || "IN12AB3456"} • ${activeVehicle.fuel_type}`
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

        {/* Single Cockpit Telemetry Cluster & Care Rings Tile */}
        <div className="funky-card p-5 sm:p-6 relative overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Left: Analog Sport Instrument Cluster */}
            <Link
              href={user ? "/logs?filter=fuel" : "/"}
              className="sm:col-span-6 flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] hover:brightness-105 transition-all"
            >
              <div className="relative w-56 h-36 flex items-center justify-center">
                <svg
                  viewBox="0 0 220 142"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="atlasClusterGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#3898ec" />
                      <stop offset="100%" stopColor="#025cbc" />
                    </linearGradient>
                    <filter
                      id="needleGlow"
                      x="-30%"
                      y="-30%"
                      width="160%"
                      height="160%"
                    >
                      <feGaussianBlur stdDeviation="2.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {Array.from({ length: 31 }).map((_, idx) => {
                    const angle = startAngle + (idx / 30) * totalSweep;
                    const isMajor = idx % 5 === 0;
                    const pOuter = polarToCartesian(
                      dialCx,
                      dialCy,
                      outerTickR,
                      angle,
                    );
                    const pInner = polarToCartesian(
                      dialCx,
                      dialCy,
                      isMajor ? majorTickInnerR : minorTickInnerR,
                      angle,
                    );
                    const isLit = idx <= Math.round(avgMileageNum);

                    return (
                      <line
                        key={idx}
                        x1={pInner.x}
                        y1={pInner.y}
                        x2={pOuter.x}
                        y2={pOuter.y}
                        stroke={isLit ? "#3898ec" : "currentColor"}
                        strokeOpacity={isLit ? 0.95 : isMajor ? 0.45 : 0.22}
                        strokeWidth={isMajor ? 2 : 1.1}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {[0, 5, 10, 15, 20, 25, 30].map((val) => {
                    const angle = startAngle + (val / 30) * totalSweep;
                    const pos = polarToCartesian(dialCx, dialCy, labelR, angle);
                    return (
                      <text
                        key={val}
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="8.5"
                        fontWeight="800"
                        fill="currentColor"
                        fillOpacity="0.68"
                      >
                        {val}
                      </text>
                    );
                  })}

                  <path
                    d={trackArcPath}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.14"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {activeArcPath && (
                    <path
                      d={activeArcPath}
                      fill="none"
                      stroke="url(#atlasClusterGrad)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  )}

                  <line
                    x1={needleBase.x}
                    y1={needleBase.y}
                    x2={needleTip.x}
                    y2={needleTip.y}
                    stroke="#3898ec"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    filter="url(#needleGlow)"
                  />
                </svg>

                <div className="absolute bottom-2.5 text-center pointer-events-none">
                  <div className="text-3xl font-black tabular-nums leading-none tracking-tight">
                    {avgMileage}
                  </div>
                  <div className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)] mt-1">
                    Avg km/l
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2.5 border-t border-[var(--border-subtle)] w-full flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] px-1">
                <span>Last: {latestMileage} km/l</span>
                <span className="flex items-center gap-1">
                  <Fuel className="w-3 h-3" />
                  {totalFuelLiters.toFixed(0)} L
                </span>
              </div>
            </Link>

            {/* Right: Monthly Spend + Radial Wash & Service Rings */}
            <div className="sm:col-span-6 flex flex-col justify-between gap-4">
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

              <div className="grid grid-cols-2 gap-3">
                {/* Wash Ring */}
                <div
                  onClick={() => user && router.push("/logs?filter=wash")}
                  className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] flex flex-col items-center text-center gap-2 cursor-pointer hover:brightness-105 transition-all"
                >
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg
                      viewBox="0 0 44 44"
                      className="w-full h-full -rotate-90"
                    >
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
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] truncate max-w-[105px]">
                      {maint ? maint.seasonLabel : "Wash Care"}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!activeVehicle}
                    onClick={(e) => openQuickCareModal(e, "wash")}
                    className="funky-btn w-full py-1 px-2 rounded-full bg-white/30 dark:bg-white/10 text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Washed</span>
                  </button>
                </div>

                {/* Service Ring */}
                <div
                  onClick={() => user && router.push("/logs?filter=service")}
                  className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] flex flex-col items-center text-center gap-2 cursor-pointer hover:brightness-105 transition-all"
                >
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg
                      viewBox="0 0 44 44"
                      className="w-full h-full -rotate-90"
                    >
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
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] tabular-nums truncate max-w-[115px]">
                      {activeVehicle
                        ? `Due @ ${nextServiceTargetOdo.toLocaleString()} km`
                        : "Next service"}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!activeVehicle}
                    onClick={(e) => openQuickCareModal(e, "service")}
                    className="funky-btn w-full py-1 px-2 rounded-full bg-white/30 dark:bg-white/10 text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Serviced</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Running Economics (₹/km) + Compliance & Renewal Dates */}
        {activeVehicle && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cost-Per-Kilometer & True Ownership Economics */}
            <Link
              href={user ? "/logs" : "/"}
              className="funky-card p-5 flex flex-col justify-between gap-3.5 hover:brightness-105 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-sm flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-[#025cbc] dark:text-[#3898ec]" />
                  Running Economics
                </span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] tabular-nums">
                  {trackedDistance.toLocaleString()} km tracked
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)]">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                    Fuel Cost / km
                  </div>
                  <div className="text-xl sm:text-2xl font-black tabular-nums mt-0.5">
                    ₹{fuelCostPerKm > 0 ? fuelCostPerKm.toFixed(2) : "0.00"}
                    <span className="text-xs font-bold text-[var(--text-muted)]">
                      /km
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5 tabular-nums">
                    ₹{Math.round(totalFuelSpend).toLocaleString()} fuel
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)]">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                    All-In Ownership
                  </div>
                  <div className="text-xl sm:text-2xl font-black tabular-nums mt-0.5">
                    ₹{allInCostPerKm > 0 ? allInCostPerKm.toFixed(2) : "0.00"}
                    <span className="text-xs font-bold text-[var(--text-muted)]">
                      /km
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5 tabular-nums">
                    +₹{Math.round(nonFuelSpend).toLocaleString()} care &amp;
                    parts
                  </div>
                </div>
              </div>

              {/* Fuel vs Care Cost Ratio Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-extrabold text-[var(--text-muted)]">
                  <span>Fuel ({fuelShareOfCostPct}%)</span>
                  <span>
                    Parts, Service &amp; Wash (
                    {totalAllSpend > 0 ? 100 - fuelShareOfCostPct : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden border border-[var(--border-color)] flex">
                  <div
                    className="h-full bg-[#3898ec] transition-all duration-500"
                    style={{ width: `${fuelShareOfCostPct}%` }}
                  />
                  <div
                    className="h-full bg-[#025cbc] transition-all duration-500"
                    style={{
                      width: `${totalAllSpend > 0 ? 100 - fuelShareOfCostPct : 0}%`,
                    }}
                  />
                </div>
              </div>
            </Link>

            {/* Compliance & Renewal Dates Vault (Dates + Reminders Only) */}
            <div className="funky-card p-5 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#025cbc] dark:text-[#3898ec]" />
                  Renewal Dates
                </span>
                <Link
                  href="/garage"
                  className="text-[11px] font-extrabold text-[#025cbc] dark:text-[#3898ec] hover:opacity-80"
                >
                  Edit Dates →
                </Link>
              </div>

              <div className="space-y-2">
                {renewalItems.map(({ label, info }) => {
                  const badgeClass = !info
                    ? "bg-[var(--accent-secondary)] text-[var(--text-muted)] border-[var(--border-color)]"
                    : info.tone === "danger"
                      ? "bg-red-500/15 text-red-500 border-red-400/40"
                      : info.tone === "warning"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40";

                  return (
                    <Link
                      key={label}
                      href="/garage"
                      className="px-3.5 py-2.5 rounded-2xl bg-[var(--accent-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-2 hover:brightness-105 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold">{label}</div>
                        <div className="text-[10px] font-semibold text-[var(--text-muted)]">
                          {info
                            ? `Valid till ${info.formattedDate}`
                            : "Tap to set expiry date"}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black border tabular-nums ${badgeClass}`}
                      >
                        {info ? info.statusLabel : "Not set"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

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
                  <h2 className="font-black text-sm sm:text-base">
                    Recent Logs
                  </h2>
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

          {logsExpanded && (
            <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
              {vLogs.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-3">
                  No telemetry logs yet. Tap + in the top bar to log fuel or
                  care.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {vLogs.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-2.5 text-xs"
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

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="font-black text-sm tabular-nums">
                          {item.amount > 0
                            ? `₹${item.amount.toLocaleString()}`
                            : "Logged"}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteRecent(item.id, item.category)
                          }
                          title="Delete log"
                          aria-label="Delete log"
                          className="p-1.5 rounded-full text-red-500/80 hover:text-red-500 hover:bg-red-500/15 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Wash / Service Date & Odometer Modal */}
      {quickModalType && activeVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="glass-modal w-full max-w-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black leading-tight">
                  {quickModalType === "wash"
                    ? "Log Vehicle Wash"
                    : "Log Periodic Service"}
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {activeVehicle.name} • Select date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickModalType(null)}
                className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickLog} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickDate(getLocalDateString(0))}
                  className={`py-2 px-3 rounded-2xl text-xs font-extrabold cursor-pointer ${
                    quickDate === getLocalDateString(0)
                      ? "funky-btn-primary"
                      : "funky-btn bg-[var(--accent-secondary)]"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(getLocalDateString(-1))}
                  className={`py-2 px-3 rounded-2xl text-xs font-extrabold cursor-pointer ${
                    quickDate === getLocalDateString(-1)
                      ? "funky-btn-primary"
                      : "funky-btn bg-[var(--accent-secondary)]"
                  }`}
                >
                  Yesterday
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold">Date</label>
                <input
                  type="date"
                  required
                  value={quickDate}
                  max={getLocalDateString(0)}
                  onChange={(e) => setQuickDate(e.target.value)}
                  className="flex items-center w-full h-11 mt-1.5 px-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium leading-none appearance-none focus:outline-none"
                />
              </div>

              {quickModalType === "service" && (
                <div>
                  <label className="block text-xs font-bold">
                    Odometer at Service (km)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    required
                    placeholder="Enter odometer in km"
                    value={quickOdo}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) =>
                      setQuickOdo(e.target.value.replace(/-/g, ""))
                    }
                    className="flex items-center w-full h-11 mt-1.5 px-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium leading-none appearance-none focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={quickBusy}
                className="funky-btn-primary w-full py-3 rounded-full font-black text-sm cursor-pointer disabled:opacity-50"
              >
                {quickBusy
                  ? "Saving..."
                  : quickModalType === "wash"
                    ? "Save Wash Log"
                    : "Save Service Log"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
