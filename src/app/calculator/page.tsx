"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Navigation, ExternalLink, Fuel, Route } from "lucide-react";

export default function TripCalculatorPage() {
  const { user, activeVehicle, logs } = useApp();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);

  const [oneWayKm, setOneWayKm] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!user) {
      setOrigin("");
      setDestination("");
      setFuelPrice("");
      setRoundTrip(false);
      setOneWayKm(0);
      setErrorMsg("");
    }
  }, [user]);

  const vehicleMileages = activeVehicle
    ? logs
        .filter(
          (l) => l.vehicle_id === activeVehicle.id && l.calculated_mileage,
        )
        .map((l) => Number(l.calculated_mileage))
    : [];

  const avgMileage =
    vehicleMileages.length > 0
      ? Number(
          (
            vehicleMileages.reduce((a, b) => a + b, 0) / vehicleMileages.length
          ).toFixed(2),
        )
      : 0;

  const calculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const geo1 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          origin,
        )}`,
      ).then((r) => r.json());
      const geo2 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          destination,
        )}`,
      ).then((r) => r.json());

      if (!geo1?.[0] || !geo2?.[0]) {
        setErrorMsg(
          "Could not locate one of those places. Try adding city/state name.",
        );
        setLoading(false);
        return;
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${geo1[0].lon},${geo1[0].lat};${geo2[0].lon},${geo2[0].lat}?overview=false`;
      const routeData = await fetch(osrmUrl).then((r) => r.json());

      if (routeData?.routes?.[0]?.distance) {
        setOneWayKm(Number((routeData.routes[0].distance / 1000).toFixed(1)));
      } else {
        setErrorMsg("Driving route unavailable between those points.");
      }
    } catch {
      setErrorMsg("Route lookup failed. Check internet connection.");
    }
    setLoading(false);
  };

  const totalDistance =
    oneWayKm > 0 ? (roundTrip ? oneWayKm * 2 : oneWayKm) : 0;
  const fuelNeeded =
    totalDistance > 0 && avgMileage > 0 ? totalDistance / avgMileage : 0;
  const numericFuelPrice = Number(fuelPrice) || 0;
  const estimatedCost =
    fuelNeeded > 0 && numericFuelPrice > 0 ? fuelNeeded * numericFuelPrice : 0;

  const mapsUrl =
    origin.trim() && destination.trim()
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          origin,
        )}&destination=${encodeURIComponent(destination)}&travelmode=driving`
      : "https://www.google.com/maps";

  const inputClass =
    "w-full mt-1.5 px-3.5 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm font-medium focus:outline-none";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black">Route Strategy Calculator</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Calculated using{" "}
          {activeVehicle ? `${activeVehicle.name}'s` : "your vehicle’s"} logged
          mileage ({avgMileage} km/l)
        </p>
      </div>

      <form onSubmit={calculateRoute} className="funky-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">Start Location</label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Enter start location"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold">Destination</label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-xs font-bold">Fuel Rate (₹/Liter)</label>
            <input
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>

          {/* High-Contrast Frosted Pill Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={roundTrip}
            onClick={() => setRoundTrip((prev) => !prev)}
            className="funky-btn w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[var(--accent-secondary)] cursor-pointer text-xs font-extrabold"
          >
            <span>Round Trip (2x)</span>
            <span
              className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                roundTrip
                  ? "bg-[#1a4b68] dark:bg-[#3b82b6] border-white/50"
                  : "bg-slate-400/35 dark:bg-slate-700/75 border-slate-500/30 dark:border-white/25"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  roundTrip ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs font-bold text-red-500">{errorMsg}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="funky-btn-primary flex-1 py-3 px-5 rounded-full font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            {loading ? "Calculating Route..." : "Calculate Trip"}
          </button>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="funky-btn py-3 px-5 rounded-full bg-[var(--accent-secondary)] font-black text-xs flex items-center justify-center gap-1.5"
          >
            Google Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </form>

      {/* Trip Output Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="funky-card p-4 text-center space-y-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)]">
            Distance
          </div>
          <div className="text-xl font-black tabular-nums">
            {totalDistance.toFixed(1)} km
          </div>
        </div>
        <div className="funky-card p-4 text-center space-y-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)] flex items-center justify-center gap-1">
            <Fuel className="w-3 h-3" /> Fuel
          </div>
          <div className="text-xl font-black tabular-nums">
            {fuelNeeded.toFixed(1)} L
          </div>
        </div>
        <div className="funky-card p-4 text-center space-y-1">
          <div className="text-[11px] font-bold text-[var(--text-muted)]">
            Est. Cost
          </div>
          <div className="text-xl font-black tabular-nums">
            ₹{Math.round(estimatedCost).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stylized Telemetry Route Vector */}
      <div className="funky-card p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold">
          <span className="flex items-center gap-1.5">
            <Route className="w-4 h-4" /> Route Telemetry Trace
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)]">
            {roundTrip ? "Round-Trip" : "One-Way"} • {totalDistance.toFixed(0)}{" "}
            km
          </span>
        </div>

        <svg viewBox="0 0 400 90" className="w-full h-24">
          <path
            d="M 25 68 Q 120 55, 200 42 T 375 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="25" cy="68" r="6" fill="currentColor" />
          <circle
            cx="375"
            cy="22"
            r="6"
            fill="var(--bg-main)"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>

        <div className="flex justify-between text-[11px] font-extrabold text-[var(--text-muted)]">
          <span>START: {origin.trim() ? origin.split(",")[0] : "—"}</span>
          <span>
            END: {destination.trim() ? destination.split(",")[0] : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
