"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp, LogEntry } from "@/context/AppContext";
import {
  FileDown,
  Filter,
  TrendingUp,
  PieChart,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

type FilterTab = "all" | "fuel" | "expense" | "service" | "wash";

const CATEGORY_THEME: Record<
  LogEntry["type"],
  {
    label: string;
    shortLabel: string;
    stroke: string;
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
    badgeBg: "rgba(14, 132, 235, 0.16)",
    badgeText: "#025cbc",
    badgeBorder: "rgba(14, 132, 235, 0.42)",
    cardTint: "rgba(14, 132, 235, 0.05)",
  },
  expense: {
    label: "Parts & Accessories",
    shortLabel: "Parts",
    stroke: "#6366f1",
    badgeBg: "rgba(99, 102, 241, 0.16)",
    badgeText: "#4338ca",
    badgeBorder: "rgba(99, 102, 241, 0.42)",
    cardTint: "rgba(99, 102, 241, 0.05)",
  },
  service: {
    label: "Service",
    shortLabel: "Service",
    stroke: "#10b981",
    badgeBg: "rgba(16, 185, 129, 0.16)",
    badgeText: "#047857",
    badgeBorder: "rgba(16, 185, 129, 0.42)",
    cardTint: "rgba(16, 185, 129, 0.05)",
  },
  wash: {
    label: "Wash & Care",
    shortLabel: "Wash",
    stroke: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeText: "#b45309",
    badgeBorder: "rgba(245, 158, 11, 0.45)",
    cardTint: "rgba(245, 158, 11, 0.05)",
  },
};

function LogsContent() {
  const searchParams = useSearchParams();
  const { theme, activeVehicle, logs, updateLog, deleteLog, owner } = useApp();
  const [filterType, setFilterType] = useState<FilterTab>("all");
  const [activeSliceIdx, setActiveSliceIdx] = useState<number | null>(null);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editLiters, setEditLiters] = useState("");
  const [editOdo, setEditOdo] = useState("");
  const [editMileage, setEditMileage] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isDark = theme === "dark";

  const getReadableTextColor = (type: LogEntry["type"]) => {
    if (!isDark) return CATEGORY_THEME[type].badgeText;
    if (type === "fuel") return "#60a5fa";
    if (type === "expense") return "#a5b4fc";
    if (type === "service") return "#6ee7b7";
    return "#fcd34d";
  };

  useEffect(() => {
    const param = searchParams.get("filter") as FilterTab | null;
    if (
      param &&
      ["all", "fuel", "expense", "service", "wash"].includes(param)
    ) {
      setFilterType(param);
    }
  }, [searchParams]);

  const vehicleLogs = activeVehicle
    ? logs.filter((l) => l.vehicle_id === activeVehicle.id)
    : logs;

  const filteredLogs =
    filterType === "all"
      ? vehicleLogs
      : vehicleLogs.filter((l) => l.type === filterType);

  const openEditModal = (entry: LogEntry) => {
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

  const handleDeleteLog = async (id: string, label: string, date: string) => {
    if (!confirm(`Delete "${label}" (${date})?`)) return;
    await deleteLog(id);
  };

  // Show last 8 fuel entries chronologically
  const comboPoints = [...vehicleLogs]
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
    })
    .slice(-8);

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

  // Category Expense Split Breakdown & Donut Geometry
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

  const rawBuckets = (
    [
      { type: "fuel" as const, amount: fuelSpend },
      { type: "expense" as const, amount: partsSpend },
      { type: "service" as const, amount: serviceSpend },
      { type: "wash" as const, amount: washSpend },
    ] as const
  )
    .filter((b) => b.amount > 0)
    .map((b) => ({
      ...b,
      ...CATEGORY_THEME[b.type],
    }));

  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPct = 0;

  const donutSlices = rawBuckets.map((bucket) => {
    const exactPct = totalSpend > 0 ? (bucket.amount / totalSpend) * 100 : 0;
    const roundedPct = Math.round(exactPct);
    const dashLength = (exactPct / 100) * donutCircumference;
    const gap = rawBuckets.length > 1 ? 2.5 : 0;
    const strokeDasharray = `${Math.max(0, dashLength - gap).toFixed(2)} ${donutCircumference.toFixed(2)}`;
    const strokeDashoffset = -((accumulatedPct / 100) * donutCircumference);
    accumulatedPct += exactPct;

    return {
      ...bucket,
      exactPct,
      roundedPct,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const focusedSlice =
    activeSliceIdx !== null && donutSlices[activeSliceIdx]
      ? donutSlices[activeSliceIdx]
      : null;

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

        {/* Synchronized Dual-Track Mileage & Fuel Chart + Interactive Donut Pie Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="funky-card p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Mileage &amp; Fuel Combo
              </span>
              <div className="flex items-center gap-2.5 text-[10px] font-extrabold text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-current inline-block" />
                  km/l
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-current opacity-25 inline-block" />
                  Fuel (L)
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
                    stroke="currentColor"
                    strokeWidth="2.5"
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
                      stroke="#0e84eb"
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

          {/* Interactive Donut Pie Chart Expense Split (Full Unclipped Labels & High-Contrast Pills) */}
          <div className="funky-card p-5 flex flex-col justify-between gap-3.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm flex items-center gap-1.5">
                <PieChart className="w-4 h-4" /> Expense Split
              </span>
              <span className="text-xs font-black tabular-nums">
                Total: ₹{totalSpend.toLocaleString()}
              </span>
            </div>

            {donutSlices.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)]">
                No expenses recorded yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Top: Centered Interactive Donut Ring */}
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg
                      viewBox="0 0 112 112"
                      className="w-full h-full -rotate-90 overflow-visible"
                    >
                      <circle
                        cx="56"
                        cy="56"
                        r={donutRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.1"
                        strokeWidth="15"
                      />

                      {donutSlices.map((slice, idx) => {
                        const isSelected = activeSliceIdx === idx;
                        return (
                          <circle
                            key={slice.label}
                            cx="56"
                            cy="56"
                            r={donutRadius}
                            fill="none"
                            stroke={slice.stroke}
                            strokeWidth={isSelected ? "18" : "15"}
                            strokeDasharray={slice.strokeDasharray}
                            strokeDashoffset={slice.strokeDashoffset}
                            strokeLinecap="butt"
                            onClick={() =>
                              setActiveSliceIdx((prev) =>
                                prev === idx ? null : idx,
                              )
                            }
                            onMouseEnter={() => setActiveSliceIdx(idx)}
                            onMouseLeave={() => setActiveSliceIdx(null)}
                            className="transition-all duration-300 cursor-pointer"
                            style={{
                              opacity:
                                activeSliceIdx === null || isSelected
                                  ? 1
                                  : 0.42,
                            }}
                          />
                        );
                      })}
                    </svg>

                    {/* Center Readout */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] max-w-[74px] leading-tight">
                        {focusedSlice ? focusedSlice.shortLabel : "Total"}
                      </span>
                      <span className="text-xs font-black tabular-nums leading-tight mt-0.5">
                        ₹
                        {Math.round(
                          focusedSlice ? focusedSlice.amount : totalSpend,
                        ).toLocaleString()}
                      </span>
                      {focusedSlice && (
                        <span
                          className="text-[10px] font-black mt-0.5"
                          style={{
                            color: getReadableTextColor(focusedSlice.type),
                          }}
                        >
                          {focusedSlice.roundedPct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom: Full-Width Unclipped Category Rows */}
                <div className="space-y-1.5">
                  {donutSlices.map((slice, idx) => {
                    const isSelected = activeSliceIdx === idx;
                    const textColor = getReadableTextColor(slice.type);
                    return (
                      <button
                        key={slice.label}
                        type="button"
                        onClick={() => {
                          setActiveSliceIdx((prev) =>
                            prev === idx ? null : idx,
                          );
                          setFilterType((prev) =>
                            prev === slice.type ? "all" : slice.type,
                          );
                        }}
                        onMouseEnter={() => setActiveSliceIdx(idx)}
                        onMouseLeave={() => setActiveSliceIdx(null)}
                        className={`w-full px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected || filterType === slice.type
                            ? "bg-white/25 dark:bg-white/12 scale-[1.01]"
                            : "bg-[var(--accent-secondary)]/70 hover:brightness-105"
                        }`}
                        style={{
                          borderColor:
                            isSelected || filterType === slice.type
                              ? slice.stroke
                              : "var(--border-subtle)",
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: slice.stroke }}
                          />
                          <span className="text-xs font-extrabold">
                            {slice.label}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs font-black tabular-nums">
                            ₹{slice.amount.toLocaleString()}
                          </span>
                          <span
                            className="text-[11px] font-black px-2 py-0.5 rounded-full tabular-nums border"
                            style={{
                              backgroundColor: slice.badgeBg,
                              color: textColor,
                              borderColor: slice.badgeBorder,
                            }}
                          >
                            {slice.roundedPct}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Color-Coded Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
          {(
            [
              { id: "all", label: "All", dotColor: null },
              {
                id: "fuel",
                label: "Fuel",
                dotColor: CATEGORY_THEME.fuel.stroke,
              },
              {
                id: "expense",
                label: "Parts & Expenses",
                dotColor: CATEGORY_THEME.expense.stroke,
              },
              {
                id: "service",
                label: "Service",
                dotColor: CATEGORY_THEME.service.stroke,
              },
              {
                id: "wash",
                label: "Wash",
                dotColor: CATEGORY_THEME.wash.stroke,
              },
            ] as const
          ).map((tab) => {
            const active = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  active
                    ? "funky-btn-primary"
                    : "funky-btn bg-[var(--accent-secondary)]"
                }`}
              >
                {tab.dotColor && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: active ? "#ffffff" : tab.dotColor,
                    }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Color-Coded Log Cards List */}
        {filteredLogs.length === 0 ? (
          <div className="funky-card p-8 text-center text-xs text-[var(--text-muted)]">
            No logs found for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((entry) => {
              const catStyle =
                CATEGORY_THEME[entry.type] || CATEGORY_THEME.expense;
              const badgeTextColor = getReadableTextColor(entry.type);
              const ratePerLiter =
                entry.type === "fuel" &&
                entry.fuel_liters &&
                entry.fuel_liters > 0
                  ? (entry.amount / entry.fuel_liters).toFixed(2)
                  : null;

              return (
                <div
                  key={entry.id}
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: catStyle.stroke,
                    backgroundImage: `linear-gradient(90deg, ${catStyle.cardTint} 0%, transparent 45%)`,
                  }}
                  className="funky-card p-4 sm:p-5 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        style={{
                          backgroundColor: catStyle.badgeBg,
                          color: badgeTextColor,
                          borderColor: catStyle.badgeBorder,
                        }}
                        className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide border"
                      >
                        {entry.category}
                      </span>

                      <span className="font-extrabold text-sm leading-snug break-words">
                        {entry.notes || entry.category}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-[var(--text-muted)] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>Date: {entry.date}</span>
                      {entry.odo_reading ? (
                        <span>
                          • Odometer: {entry.odo_reading.toLocaleString()} km
                        </span>
                      ) : null}
                      {entry.type === "fuel" && entry.fuel_liters ? (
                        <span>
                          • Fuel: {entry.fuel_liters} L
                          {ratePerLiter ? ` (₹${ratePerLiter}/L)` : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-start gap-2">
                    <div className="text-right space-y-1.5">
                      <div className="text-base sm:text-lg font-black tabular-nums leading-tight">
                        {entry.amount > 0
                          ? `₹${entry.amount.toLocaleString()}`
                          : "Logged"}
                      </div>

                      {entry.type === "fuel" && entry.calculated_mileage ? (
                        <div
                          style={{
                            backgroundColor: catStyle.badgeBg,
                            color: badgeTextColor,
                            borderColor: catStyle.badgeBorder,
                          }}
                          className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black tabular-nums border"
                        >
                          {entry.calculated_mileage} km/l
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(entry)}
                      title="Edit entry"
                      aria-label="Edit entry"
                      className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteLog(
                          entry.id,
                          entry.notes || entry.category,
                          entry.date,
                        )
                      }
                      title="Delete entry"
                      aria-label="Delete entry"
                      className="funky-btn p-2 rounded-full bg-red-500/12 text-red-500 border-red-400/35 hover:bg-red-500/20 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Log Modal */}
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
