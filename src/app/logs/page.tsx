"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp, LogEntry } from "@/context/AppContext";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import {
  FileDown,
  Filter,
  TrendingUp,
  PieChart,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  ListFilter,
  Calendar,
} from "lucide-react";

type FilterTab = "all" | "fuel" | "expense" | "service" | "wash";

const CATEGORY_THEME: Record<
  LogEntry["type"],
  {
    label: string;
    shortLabel: string;
    stroke: string;
    classicStroke: string;
    classicFrostedFill: string;
    classicFrostedRim: string;
    classicBadgeBg: string;
    classicBadgeText: string;
    classicBadgeBorder: string;
    classicCardTint: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    cardTint: string;
  }
> = {
  fuel: {
    label: "Fuel",
    shortLabel: "Fuel",
    stroke: "#0e84eb",
    classicStroke: "#025cbc",
    classicFrostedFill: "rgba(2, 92, 188, 0.36)",
    classicFrostedRim: "rgba(186, 224, 253, 0.65)",
    classicBadgeBg: "rgba(2, 92, 188, 0.12)",
    classicBadgeText: "#025cbc",
    classicBadgeBorder: "rgba(2, 92, 188, 0.3)",
    classicCardTint: "rgba(2, 92, 188, 0.045)",
    badgeBg: "rgba(14, 132, 235, 0.16)",
    badgeText: "#025cbc",
    badgeBorder: "rgba(14, 132, 235, 0.42)",
    cardTint: "rgba(14, 132, 235, 0.06)",
  },
  expense: {
    label: "Parts & Accessories",
    shortLabel: "Parts",
    stroke: "#6366f1",
    classicStroke: "#0e84eb",
    classicFrostedFill: "rgba(14, 132, 235, 0.32)",
    classicFrostedRim: "rgba(219, 239, 254, 0.72)",
    classicBadgeBg: "rgba(14, 132, 235, 0.12)",
    classicBadgeText: "#025cbc",
    classicBadgeBorder: "rgba(14, 132, 235, 0.3)",
    classicCardTint: "rgba(14, 132, 235, 0.04)",
    badgeBg: "rgba(99, 102, 241, 0.16)",
    badgeText: "#4338ca",
    badgeBorder: "rgba(99, 102, 241, 0.42)",
    cardTint: "rgba(99, 102, 241, 0.06)",
  },
  service: {
    label: "Service",
    shortLabel: "Service",
    stroke: "#10b981",
    classicStroke: "#3898ec",
    classicFrostedFill: "rgba(56, 152, 236, 0.3)",
    classicFrostedRim: "rgba(240, 249, 255, 0.78)",
    classicBadgeBg: "rgba(56, 152, 236, 0.14)",
    classicBadgeText: "#025cbc",
    classicBadgeBorder: "rgba(56, 152, 236, 0.34)",
    classicCardTint: "rgba(56, 152, 236, 0.045)",
    badgeBg: "rgba(16, 185, 129, 0.16)",
    badgeText: "#047857",
    badgeBorder: "rgba(16, 185, 129, 0.42)",
    cardTint: "rgba(16, 185, 129, 0.06)",
  },
  wash: {
    label: "Wash & Care",
    shortLabel: "Wash",
    stroke: "#f59e0b",
    classicStroke: "#7cc0f8",
    classicFrostedFill: "rgba(124, 192, 248, 0.28)",
    classicFrostedRim: "rgba(255, 255, 255, 0.85)",
    classicBadgeBg: "rgba(124, 192, 248, 0.18)",
    classicBadgeText: "#025cbc",
    classicBadgeBorder: "rgba(124, 192, 248, 0.42)",
    classicCardTint: "rgba(124, 192, 248, 0.055)",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeText: "#b45309",
    badgeBorder: "rgba(245, 158, 11, 0.45)",
    cardTint: "rgba(245, 158, 11, 0.06)",
  },
};

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(2);
    d += ` C ${midX} ${p0.y.toFixed(2)}, ${midX} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

function LogsContent() {
  const searchParams = useSearchParams();
  const { theme, activeVehicle, logs, updateLog, deleteLog, owner } = useApp();
  const { enhancedTheme } = useDashboardTheme();
  const [filterType, setFilterType] = useState<FilterTab>("all");
  const [activeSliceIdx, setActiveSliceIdx] = useState<number | null>(null);
  const [isYearGraphOpen, setIsYearGraphOpen] = useState(false);

  const [isLogsSectionOpen, setIsLogsSectionOpen] = useState(true);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>(
    {},
  );
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editLiters, setEditLiters] = useState("");
  const [editOdo, setEditOdo] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isDark = theme === "dark";

  const getSliceStroke = (type: LogEntry["type"]) =>
    enhancedTheme
      ? CATEGORY_THEME[type].stroke
      : CATEGORY_THEME[type].classicStroke;

  const getFrostedDotStyle = (
    type: LogEntry["type"],
    isActivePill = false,
  ): React.CSSProperties => {
    if (isActivePill) {
      return { backgroundColor: "#ffffff" };
    }
    if (!enhancedTheme) {
      const cat = CATEGORY_THEME[type];
      return {
        backgroundColor: cat.classicFrostedFill,
        border: `1px solid ${cat.classicFrostedRim}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      };
    }
    return { backgroundColor: CATEGORY_THEME[type].stroke };
  };

  const getReadableTextColor = (type: LogEntry["type"]) => {
    if (!enhancedTheme) {
      return isDark ? "#bae0fd" : CATEGORY_THEME[type].classicBadgeText;
    }
    if (!isDark) return CATEGORY_THEME[type].badgeText;
    if (type === "fuel") return "#60a5fa";
    if (type === "expense") return "#a5b4fc";
    if (type === "service") return "#6ee7b7";
    return "#fcd34d";
  };

  const getHardMileageColor = (kmpl: number) => {
    if (kmpl >= 20) return "#10b981";
    if (kmpl >= 16) return "#0e84eb";
    return "#f59e0b";
  };

  const getHardMileageTextClass = (kmpl: number) => {
    if (kmpl >= 20) return "text-emerald-600 dark:text-emerald-400";
    if (kmpl >= 16) return "text-[#025cbc] dark:text-[#60a5fa]";
    return "text-amber-600 dark:text-amber-400";
  };

  useEffect(() => {
    const param = searchParams.get("filter") as FilterTab | null;
    if (
      param &&
      ["all", "fuel", "expense", "service", "wash"].includes(param)
    ) {
      setFilterType(param);
      setVisibleCount(6);
    }
  }, [searchParams]);

  const toggleLogRow = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const vehicleLogs = activeVehicle
    ? logs.filter((l) => l.vehicle_id === activeVehicle.id)
    : logs;

  const filteredLogs =
    filterType === "all"
      ? vehicleLogs
      : vehicleLogs.filter((l) => l.type === filterType);

  const displayedLogs = filteredLogs.slice(0, visibleCount);
  const hasMoreLogs = filteredLogs.length > visibleCount;

  const openEditModal = (e: React.MouseEvent, entry: LogEntry) => {
    e.stopPropagation();
    setEditingEntry(entry);
    setEditDate(entry.date || "");
    setEditAmount(entry.amount ? String(entry.amount) : "");
    setEditLiters(entry.fuel_liters ? String(entry.fuel_liters) : "");
    setEditOdo(entry.odo_reading ? String(entry.odo_reading) : "");
    setEditMileage(
      entry.calculated_mileage ? String(entry.calculated_mileage) : "",
    );
    setEditNotes(entry.notes || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || savingEdit) return;
    setSavingEdit(true);

    await updateLog(editingEntry.id, {
      date: editDate || editingEntry.date,
      amount: Math.max(0, Number(editAmount) || 0),
      fuel_liters:
        editingEntry.type === "fuel" && editLiters
          ? Math.max(0, Number(editLiters))
          : null,
      odo_reading: editOdo ? Math.max(0, Number(editOdo)) : null,
      calculated_mileage:
        editingEntry.type === "fuel" && editMileage
          ? Math.max(0, Number(editMileage))
          : null,
      notes: editNotes.trim(),
    });

    setSavingEdit(false);
    setEditingEntry(null);
  };

  const handleDeleteLog = async (
    e: React.MouseEvent,
    id: string,
    label: string,
    date: string,
  ) => {
    e.stopPropagation();
    if (!confirm(`Delete "${label}" (${date})?`)) return;
    await deleteLog(id);
  };

  const allFuelFillups = [...vehicleLogs]
    .filter(
      (l) =>
        l.type === "fuel" &&
        (Number(l.fuel_liters || 0) > 0 ||
          Number(l.calculated_mileage || 0) > 0),
    )
    .sort((a, b) => {
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp !== 0) return dateCmp;
      return Number(a.odo_reading || 0) - Number(b.odo_reading || 0);
    });

  // Last 6 fillups for the combo graph
  const comboPoints = allFuelFillups.slice(-6);

  // Last 12 months data for the Year popup
  const nowDate = new Date();
  const yearMonths = Array.from({ length: 12 }).map((_, idx) => {
    const d = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() - (11 - idx),
      1,
    );
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const prefix = `${yyyy}-${mm}`;
    const label = d.toLocaleDateString("en-IN", { month: "short" });

    const monthFillups = allFuelFillups.filter((l) =>
      String(l.date || "").startsWith(prefix),
    );
    const liters = monthFillups.reduce(
      (sum, l) => sum + Number(l.fuel_liters || 0),
      0,
    );
    const mileages = monthFillups
      .map((l) => Number(l.calculated_mileage || 0))
      .filter((m) => m > 0);
    const avgKmpl =
      mileages.length > 0
        ? mileages.reduce((a, b) => a + b, 0) / mileages.length
        : 0;

    return {
      prefix,
      label,
      fillupsCount: monthFillups.length,
      liters,
      avgKmpl,
    };
  });

  const maxYearKmpl = Math.max(...yearMonths.map((m) => m.avgKmpl), 20);

  const validMileages = comboPoints
    .map((p) => Number(p.calculated_mileage || 0))
    .filter((m) => m > 0);

  const maxM = Math.max(...validMileages, 10);
  const minM = Math.min(...validMileages, 0);
  const rangeM = Math.max(maxM - minM, 1);

  const maxLiters = Math.max(
    ...comboPoints.map((p) => Number(p.fuel_liters || 0)),
    10,
  );

  const chartWidth = 440;
  const chartHeight = 188;
  const padX = 32;

  const lineTop = 26;
  const lineBottom = 96;
  const linePlotH = lineBottom - lineTop;

  const barAreaTop = 112;
  const barAreaBottom = 164;
  const barMaxH = barAreaBottom - barAreaTop;

  const coords = comboPoints.map((pt, idx) => {
    const x =
      comboPoints.length === 1
        ? chartWidth / 2
        : padX + (idx / (comboPoints.length - 1)) * (chartWidth - padX * 2);

    const mileageVal = Number(pt.calculated_mileage || 0);
    const hasMileage = mileageVal > 0;
    const liters = Number(pt.fuel_liters || 0);

    const yLine = hasMileage
      ? lineBottom - ((mileageVal - minM) / rangeM) * linePlotH
      : lineBottom - linePlotH * 0.4;

    const barH = Math.max(8, (liters / maxLiters) * barMaxH);
    const yBar = barAreaBottom - barH;
    const mileageStr = hasMileage ? mileageVal.toFixed(1) : "—";
    const pillW = Math.max(30, mileageStr.length * 6.5 + 8);

    return {
      id: pt.id,
      x,
      yLine,
      yBar,
      barH,
      hasMileage,
      mileageStr,
      pillW,
      liters: liters.toFixed(0),
      shortDate: pt.date.slice(5),
    };
  });

  const mileageCoords = coords.filter((c) => c.hasMileage);
  const polylineStr = mileageCoords.map((c) => `${c.x},${c.yLine}`).join(" ");
  const areaStr =
    mileageCoords.length > 1
      ? `${mileageCoords[0].x},${lineBottom + 6} ${polylineStr} ${
          mileageCoords[mileageCoords.length - 1].x
        },${lineBottom + 6}`
      : "";

  const totalSpend = vehicleLogs.reduce(
    (sum, l) => sum + Number(l.amount || 0),
    0,
  );
  const fuelSpend = vehicleLogs
    .filter((l) => l.type === "fuel")
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const partsSpend = vehicleLogs
    .filter((l) => l.type === "expense")
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const serviceSpend = vehicleLogs
    .filter((l) => l.type === "service")
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const washSpend = vehicleLogs
    .filter((l) => l.type === "wash")
    .reduce((sum, l) => sum + Number(l.amount || 0), 0);

  const activeCategoryBuckets = (
    [
      { type: "fuel" as const, amount: fuelSpend },
      { type: "expense" as const, amount: partsSpend },
      { type: "service" as const, amount: serviceSpend },
      { type: "wash" as const, amount: washSpend },
    ] as const
  )
    .filter((b) => b.amount > 0)
    .map((b) => {
      const exactPct = totalSpend > 0 ? (b.amount / totalSpend) * 100 : 0;
      return {
        ...b,
        ...CATEGORY_THEME[b.type],
        exactPct,
        roundedPct: Math.round(exactPct),
      };
    });

  // Multi-line Expense Split across the last 6 months (₹ spend per category line)
  const splitMonths = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() - (5 - idx),
      1,
    );
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const prefix = `${yyyy}-${mm}`;
    const label = d.toLocaleDateString("en-IN", { month: "short" });
    const monthLogs = vehicleLogs.filter((l) =>
      String(l.date || "").startsWith(prefix),
    );
    return {
      prefix,
      label,
      fuel: monthLogs
        .filter((l) => l.type === "fuel")
        .reduce((s, l) => s + Number(l.amount || 0), 0),
      expense: monthLogs
        .filter((l) => l.type === "expense")
        .reduce((s, l) => s + Number(l.amount || 0), 0),
      service: monthLogs
        .filter((l) => l.type === "service")
        .reduce((s, l) => s + Number(l.amount || 0), 0),
      wash: monthLogs
        .filter((l) => l.type === "wash")
        .reduce((s, l) => s + Number(l.amount || 0), 0),
    };
  });

  const maxSplitVal = Math.max(
    100,
    ...splitMonths.flatMap((m) => [m.fuel, m.expense, m.service, m.wash]),
  );

  const splitChartW = 420;
  const splitChartH = 148;
  const splitPadX = 26;
  const splitTop = 18;
  const splitBottom = 122;
  const splitPlotH = splitBottom - splitTop;

  const multiLineSeries = activeCategoryBuckets.map((bucket) => {
    const pts = splitMonths.map((m, idx) => {
      const val = m[bucket.type];
      const x =
        splitPadX +
        (idx / (splitMonths.length - 1)) * (splitChartW - splitPadX * 2);
      const y = splitBottom - (val / maxSplitVal) * splitPlotH;
      return { x, y, val, label: m.label };
    });
    return {
      ...bucket,
      color: getSliceStroke(bucket.type),
      path: buildSmoothPath(pts),
      pts,
    };
  });

  const exportPdf = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const filteredTotal = filteredLogs.reduce(
      (sum, l) => sum + Number(l.amount || 0),
      0,
    );
    const rowsHtml = filteredLogs
      .map(
        (l) => `
        <tr>
          <td>${l.date}</td>
          <td><strong>${l.category}</strong></td>
          <td>${(l.notes || l.category).replace(/</g, "&lt;")}</td>
          <td style="text-align:right;">${l.odo_reading ? l.odo_reading.toLocaleString() + " km" : "—"}</td>
          <td style="text-align:right;">${l.fuel_liters ? l.fuel_liters + " L" : "—"}</td>
          <td style="text-align:right;">${l.calculated_mileage ? l.calculated_mileage + " km/l" : "—"}</td>
          <td style="text-align:right;font-weight:700;">${l.amount > 0 ? "₹" + l.amount.toLocaleString() : "Logged"}</td>
        </tr>
      `,
      )
      .join("");

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Atlas Telemetry Report — ${activeVehicle?.name || "Vehicle"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 32px; color: #0f293a; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            .sub { color: #4c687c; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 9px 8px; border-bottom: 1px solid #d8e3ec; text-align: left; }
            th { background: #eef4f8; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
            .footer { margin-top: 18px; text-align: right; font-size: 14px; font-weight: 800; }
          </style>
        </head>
        <body>
          <h1>Atlas Telemetry &amp; Expense Report</h1>
          <div class="sub">
            Vehicle: <strong>${activeVehicle?.name || "All Vehicles"}</strong> (${activeVehicle?.plate || "N/A"}) •
            Driver: ${owner.fullName || "Owner"} • Filter: ${filterType.toUpperCase()} (${filteredLogs.length} entries)
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor &amp; Details</th>
                <th style="text-align:right;">Odometer</th>
                <th style="text-align:right;">Fuel</th>
                <th style="text-align:right;">Mileage</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">Total Spend: ₹${filteredTotal.toLocaleString()}</div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const inputClass =
    "flex items-center w-full h-11 mt-1.5 px-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium leading-none appearance-none focus:outline-none";

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">
              Telemetry &amp; Expense Logs
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {activeVehicle
                ? `${activeVehicle.name} (${activeVehicle.plate || "IN12AB3456"}) • ${filteredLogs.length} entries`
                : `${filteredLogs.length} entries`}
            </p>
          </div>

          <button
            type="button"
            onClick={exportPdf}
            className="funky-btn px-4 py-2 rounded-full bg-[var(--accent-secondary)] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mileage & Fuel Combo (Last 6 Fillups) — Tap for Year's Graph */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsYearGraphOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsYearGraphOpen(true);
              }
            }}
            title="Tap to view 12-month graph"
            className="funky-card p-5 space-y-2.5 cursor-pointer hover:brightness-105 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Mileage &amp; Fuel Combo
              </span>
              <div className="flex items-center gap-2 text-[10px] font-extrabold text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-2.5 h-0.5 inline-block"
                    style={{
                      backgroundColor: enhancedTheme
                        ? "#6366f1"
                        : "currentColor",
                    }}
                  />
                  km/l
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-current opacity-25 inline-block" />
                  Fuel (L)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] text-[var(--text-main)]">
                  1Y View
                </span>
              </div>
            </div>

            {coords.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)]">
                No fuel entries recorded yet.
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-48 overflow-visible"
              >
                <defs>
                  {enhancedTheme ? (
                    <>
                      <linearGradient
                        id="mileageLineGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#0e84eb" />
                        <stop offset="40%" stopColor="#6366f1" />
                        <stop offset="72%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient
                        id="mileageAreaGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6366f1"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#0e84eb"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </>
                  ) : (
                    <linearGradient
                      id="mileageAreaGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="currentColor"
                        stopOpacity="0.16"
                      />
                      <stop
                        offset="100%"
                        stopColor="currentColor"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  )}
                </defs>

                <line
                  x1={padX - 14}
                  y1={lineBottom + 6}
                  x2={chartWidth - padX + 14}
                  y2={lineBottom + 6}
                  stroke="currentColor"
                  strokeOpacity="0.14"
                  strokeWidth="1"
                />

                <line
                  x1={padX - 14}
                  y1={barAreaBottom}
                  x2={chartWidth - padX + 14}
                  y2={barAreaBottom}
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeWidth="1"
                />

                {coords.map((c) => (
                  <g key={`bar-${c.id}`}>
                    <line
                      x1={c.x}
                      y1={c.yLine}
                      x2={c.x}
                      y2={barAreaBottom}
                      stroke="currentColor"
                      strokeOpacity="0.14"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                    <rect
                      x={c.x - 12}
                      y={c.yBar}
                      width="24"
                      height={c.barH}
                      rx="5"
                      fill="#0e84eb"
                      fillOpacity="0.26"
                    />
                    <text
                      x={c.x}
                      y={c.yBar - 3}
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="800"
                      fill="currentColor"
                      fillOpacity="0.75"
                    >
                      {c.liters}L
                    </text>
                    <text
                      x={c.x}
                      y={barAreaBottom + 14}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="700"
                      fill="currentColor"
                      fillOpacity="0.65"
                    >
                      {c.shortDate}
                    </text>
                  </g>
                ))}

                {areaStr && (
                  <polygon points={areaStr} fill="url(#mileageAreaGrad)" />
                )}

                {mileageCoords.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={
                      enhancedTheme ? "url(#mileageLineGrad)" : "currentColor"
                    }
                    strokeWidth={enhancedTheme ? "3" : "2.5"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}

                {mileageCoords.map((c) => (
                  <g key={`node-${c.id}`}>
                    <circle
                      cx={c.x}
                      cy={c.yLine}
                      r="4"
                      fill="var(--bg-popover)"
                      stroke={enhancedTheme ? "#6366f1" : "#0e84eb"}
                      strokeWidth="2.5"
                    />
                    <rect
                      x={c.x - c.pillW / 2}
                      y={c.yLine - 22}
                      width={c.pillW}
                      height="14"
                      rx="7"
                      fill="var(--bg-popover)"
                      stroke="currentColor"
                      strokeOpacity="0.22"
                      strokeWidth="0.8"
                    />
                    <text
                      x={c.x}
                      y={c.yLine - 12}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="800"
                      fill="currentColor"
                    >
                      {c.mileageStr}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* At-a-Glance Multi-Line Expense Split Graph + Tap-to-Filter Chips */}
          <div className="funky-card p-5 flex flex-col justify-between gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-sm flex items-center gap-1.5">
                <PieChart className="w-4 h-4" /> Expense Split
              </span>
              <span className="text-xs font-black tabular-nums">
                Total: ₹{totalSpend.toLocaleString()}
              </span>
            </div>

            {activeCategoryBuckets.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)]">
                No expenses recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[var(--accent-secondary)]/65 border border-[var(--border-color)]">
                  <svg
                    viewBox={`0 0 ${splitChartW} ${splitChartH}`}
                    className="w-full h-36 overflow-visible"
                  >
                    <line
                      x1={splitPadX - 6}
                      y1={splitBottom}
                      x2={splitChartW - splitPadX + 6}
                      y2={splitBottom}
                      stroke="currentColor"
                      strokeOpacity="0.18"
                      strokeWidth="1"
                    />

                    {splitMonths.map((m, idx) => {
                      const x =
                        splitPadX +
                        (idx / (splitMonths.length - 1)) *
                          (splitChartW - splitPadX * 2);
                      return (
                        <g key={m.prefix}>
                          <line
                            x1={x}
                            y1={splitTop}
                            x2={x}
                            y2={splitBottom}
                            stroke="currentColor"
                            strokeOpacity="0.09"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={splitBottom + 16}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="700"
                            fill="currentColor"
                            fillOpacity="0.65"
                          >
                            {m.label}
                          </text>
                        </g>
                      );
                    })}

                    {multiLineSeries.map((series, idx) => {
                      const isHighlighted =
                        activeSliceIdx === null ||
                        activeSliceIdx === idx ||
                        filterType === series.type;
                      return (
                        <g
                          key={series.type}
                          style={{
                            opacity: isHighlighted ? 1 : 0.22,
                            transition: "opacity 200ms ease",
                          }}
                        >
                          {series.pts.length > 1 && (
                            <path
                              d={series.path}
                              fill="none"
                              stroke={series.color}
                              strokeWidth={isHighlighted ? "2.6" : "2"}
                              strokeLinecap="round"
                            />
                          )}
                          {series.pts.map((p, pIdx) => (
                            <circle
                              key={`${series.type}-${pIdx}`}
                              cx={p.x}
                              cy={p.y}
                              r={p.val > 0 ? "3.4" : "2"}
                              fill="var(--bg-popover)"
                              stroke={series.color}
                              strokeWidth="2"
                            />
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Large, Mobile-Friendly Category Filter Pills */}
                <div className="grid grid-cols-2 gap-2">
                  {activeCategoryBuckets.map((bucket, idx) => {
                    const isSelected =
                      activeSliceIdx === idx || filterType === bucket.type;
                    const textColor = getReadableTextColor(bucket.type);
                    const lineColor = getSliceStroke(bucket.type);

                    return (
                      <button
                        key={bucket.type}
                        type="button"
                        onClick={() => {
                          setActiveSliceIdx((prev) =>
                            prev === idx ? null : idx,
                          );
                          setFilterType((prev) =>
                            prev === bucket.type ? "all" : bucket.type,
                          );
                          setIsLogsSectionOpen(true);
                          setVisibleCount(6);
                        }}
                        style={{
                          borderColor: isSelected
                            ? lineColor
                            : "var(--border-color)",
                        }}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-white/30 dark:bg-white/15"
                            : "bg-[var(--accent-secondary)]/75 hover:brightness-105"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-0.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: lineColor,
                              height: "3px",
                              width: "10px",
                            }}
                          />
                          <span className="text-xs font-extrabold truncate">
                            {bucket.shortLabel}
                          </span>
                        </div>
                        <span
                          style={{ color: textColor }}
                          className="text-[11px] font-black tabular-nums shrink-0"
                        >
                          {bucket.roundedPct}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="funky-card p-4 sm:p-5 space-y-3.5">
          <button
            type="button"
            onClick={() => setIsLogsSectionOpen((prev) => !prev)}
            aria-expanded={isLogsSectionOpen}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ListFilter className="w-4 h-4 shrink-0 text-[#025cbc] dark:text-[#3898ec]" />
              <span className="font-black text-sm sm:text-base">
                Activity Ledger
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] tabular-nums">
                {filteredLogs.length}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-[var(--text-muted)]">
                {isLogsSectionOpen ? "Collapse" : "Expand"}
              </span>
              <div className="w-7 h-7 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] flex items-center justify-center">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isLogsSectionOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </button>

          {isLogsSectionOpen && (
            <div className="space-y-3 pt-1 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                {(
                  [
                    { id: "all", label: "All", type: null },
                    { id: "fuel", label: "Fuel", type: "fuel" as const },
                    {
                      id: "expense",
                      label: "Parts & Expenses",
                      type: "expense" as const,
                    },
                    {
                      id: "service",
                      label: "Service",
                      type: "service" as const,
                    },
                    { id: "wash", label: "Wash", type: "wash" as const },
                  ] as const
                ).map((tab) => {
                  const active = filterType === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setFilterType(tab.id);
                        setVisibleCount(6);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                        active
                          ? "funky-btn-primary"
                          : "funky-btn bg-[var(--accent-secondary)]"
                      }`}
                    >
                      {tab.type && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={getFrostedDotStyle(tab.type, active)}
                        />
                      )}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {displayedLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                  No logs found for this filter.
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedLogs.map((entry) => {
                    const catStyle =
                      CATEGORY_THEME[entry.type] || CATEGORY_THEME.expense;
                    const accentStroke = getSliceStroke(entry.type);
                    const badgeTextColor = getReadableTextColor(entry.type);
                    const badgeBg = enhancedTheme
                      ? catStyle.badgeBg
                      : catStyle.classicBadgeBg;
                    const badgeBorder = enhancedTheme
                      ? catStyle.badgeBorder
                      : catStyle.classicBadgeBorder;
                    const cardTint = enhancedTheme
                      ? catStyle.cardTint
                      : catStyle.classicCardTint;
                    const isRowOpen = !!expandedLogIds[entry.id];
                    const ratePerLiter =
                      entry.type === "fuel" &&
                      entry.fuel_liters &&
                      entry.fuel_liters > 0
                        ? (entry.amount / entry.fuel_liters).toFixed(2)
                        : null;

                    return (
                      <div
                        key={entry.id}
                        onClick={() => toggleLogRow(entry.id)}
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: accentStroke,
                          backgroundImage: `linear-gradient(90deg, ${cardTint} 0%, transparent 50%)`,
                        }}
                        className="rounded-2xl border border-[var(--border-color)] bg-[var(--accent-secondary)]/55 px-3.5 py-2.5 cursor-pointer transition-all hover:brightness-105"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              style={{
                                backgroundColor: badgeBg,
                                color: badgeTextColor,
                                borderColor: badgeBorder,
                              }}
                              className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border"
                            >
                              {entry.category}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-xs sm:text-sm truncate">
                                {entry.notes || entry.category}
                              </div>
                              <div className="text-[10px] font-semibold text-[var(--text-muted)]">
                                {entry.date}
                                {entry.odo_reading
                                  ? ` • ${entry.odo_reading.toLocaleString()} km`
                                  : ""}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-xs sm:text-sm font-black tabular-nums">
                                {entry.amount > 0
                                  ? `₹${entry.amount.toLocaleString()}`
                                  : "Logged"}
                              </div>
                              {entry.type === "fuel" &&
                              entry.calculated_mileage ? (
                                <div
                                  style={{ color: badgeTextColor }}
                                  className="text-[10px] font-black tabular-nums"
                                >
                                  {entry.calculated_mileage} km/l
                                </div>
                              ) : null}
                            </div>

                            <ChevronDown
                              className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
                                isRowOpen ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {isRowOpen && (
                          <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="text-[11px] font-medium text-[var(--text-muted)] space-y-0.5">
                              {entry.type === "fuel" && entry.fuel_liters ? (
                                <div>
                                  Fuel Filled:{" "}
                                  <strong className="text-[var(--text-main)]">
                                    {entry.fuel_liters} L
                                  </strong>
                                  {ratePerLiter ? ` @ ₹${ratePerLiter}/L` : ""}
                                </div>
                              ) : null}
                              {entry.notes && (
                                <div className="break-words">
                                  Details:{" "}
                                  <span className="text-[var(--text-main)]">
                                    {entry.notes}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                type="button"
                                onClick={(e) => openEditModal(e, entry)}
                                className="funky-btn px-3 py-1.5 rounded-full bg-[var(--accent-secondary)] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleDeleteLog(
                                    e,
                                    entry.id,
                                    entry.notes || entry.category,
                                    entry.date,
                                  )
                                }
                                className="funky-btn px-3 py-1.5 rounded-full bg-red-500/12 text-red-500 border-red-400/35 hover:bg-red-500/20 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredLogs.length > 6 && (
                <div className="pt-1 flex items-center justify-center gap-2">
                  {hasMoreLogs && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="funky-btn px-4 py-2 rounded-full bg-[var(--accent-secondary)] text-xs font-extrabold cursor-pointer"
                    >
                      Show More ({filteredLogs.length - visibleCount} remaining)
                    </button>
                  )}
                  {visibleCount > 6 && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(6)}
                      className="funky-btn px-3.5 py-2 rounded-full bg-[var(--accent-secondary)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
                    >
                      Collapse List
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 12-Month / Year Graph Modal */}
      {isYearGraphOpen && (
        <div
          onClick={() => setIsYearGraphOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-modal w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black flex items-center gap-1.5">
                  <Calendar
                    className={`w-4 h-4 ${
                      enhancedTheme
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-[#025cbc] dark:text-[#3898ec]"
                    }`}
                  />
                  12-Month Mileage &amp; Fuel
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Monthly average km/l &amp; fuel volume over the past year
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsYearGraphOpen(false)}
                aria-label="Close year graph"
                className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              style={
                enhancedTheme
                  ? {
                      backgroundImage:
                        "linear-gradient(135deg, rgba(14, 132, 235, 0.08), rgba(99, 102, 241, 0.08))",
                    }
                  : undefined
              }
              className="p-3.5 rounded-2xl bg-[var(--accent-secondary)]/75 border border-[var(--border-color)] space-y-3"
            >
              <div className="flex items-center justify-between text-[11px] font-extrabold">
                <span
                  className={
                    enhancedTheme
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[var(--text-muted)]"
                  }
                >
                  AVG KM/L
                </span>
                <span
                  className={
                    enhancedTheme
                      ? "text-[#025cbc] dark:text-[#60a5fa]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  FUEL LITERS
                </span>
              </div>

              <div className="grid grid-cols-12 gap-1.5 items-end h-36 pt-4">
                {yearMonths.map((m) => {
                  const kmplPct =
                    m.avgKmpl > 0
                      ? Math.max(
                          10,
                          Math.round((m.avgKmpl / maxYearKmpl) * 100),
                        )
                      : 0;
                  const barColor =
                    m.avgKmpl > 0
                      ? enhancedTheme
                        ? getHardMileageColor(m.avgKmpl)
                        : "#025cbc"
                      : "transparent";
                  const labelClass =
                    m.avgKmpl > 0 && enhancedTheme
                      ? getHardMileageTextClass(m.avgKmpl)
                      : "text-[var(--text-main)]";

                  return (
                    <div
                      key={m.prefix}
                      className="h-full flex flex-col items-center justify-end gap-1 min-w-0"
                    >
                      <span
                        className={`text-[9px] font-black tabular-nums ${labelClass}`}
                      >
                        {m.avgKmpl > 0 ? m.avgKmpl.toFixed(1) : "—"}
                      </span>
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div
                          className="w-full max-w-[18px] rounded-t-md transition-all duration-300"
                          style={{
                            height: `${kmplPct}%`,
                            backgroundColor: barColor,
                            opacity: m.avgKmpl > 0 ? 0.92 : 0,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-[var(--text-muted)] truncate">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-[var(--border-subtle)] text-xs">
              {yearMonths
                .slice()
                .reverse()
                .filter((m) => m.fillupsCount > 0 || m.liters > 0)
                .map((m) => (
                  <div
                    key={m.prefix}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <div className="font-extrabold">
                      {m.label} {m.prefix.slice(0, 4)}{" "}
                      <span
                        className={`text-[11px] font-semibold ${
                          enhancedTheme
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        ({m.fillupsCount}{" "}
                        {m.fillupsCount === 1 ? "fillup" : "fillups"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums font-black">
                      <span
                        className={
                          enhancedTheme
                            ? "text-[#025cbc] dark:text-[#60a5fa]"
                            : "text-[#025cbc] dark:text-[#60a5fa]"
                        }
                      >
                        {m.liters.toFixed(1)} L
                      </span>
                      <span
                        className={
                          m.avgKmpl > 0 && enhancedTheme
                            ? getHardMileageTextClass(m.avgKmpl)
                            : ""
                        }
                      >
                        {m.avgKmpl > 0 ? `${m.avgKmpl.toFixed(2)} km/l` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              {yearMonths.every(
                (m) => m.fillupsCount === 0 && m.liters === 0,
              ) && (
                <div className="py-4 text-center text-[var(--text-muted)]">
                  No fuel fillups in the past 12 months.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="glass-modal w-full max-w-md p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black">
                  Edit {editingEntry.category} Entry
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Update odometer or mileage to recalculate graphs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold">Amount (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) =>
                      setEditAmount(e.target.value.replace(/-/g, ""))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {editingEntry.type === "fuel" && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold">Fuel (L)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editLiters}
                      onChange={(e) =>
                        setEditLiters(e.target.value.replace(/-/g, ""))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold">Odo (km)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={editOdo}
                      onChange={(e) =>
                        setEditOdo(e.target.value.replace(/-/g, ""))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold">km/l</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="Auto"
                      value={editMileage}
                      onChange={(e) =>
                        setEditMileage(e.target.value.replace(/-/g, ""))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={savingEdit}
                className="funky-btn-primary w-full py-3 rounded-full font-black text-sm cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function LogsPage() {
  return (
    <Suspense
      fallback={
        <div className="funky-card p-6 text-xs font-bold">Loading logs...</div>
      }
    >
      <LogsContent />
    </Suspense>
  );
}
