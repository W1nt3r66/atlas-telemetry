"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import {
  Navigation,
  ExternalLink,
  Fuel,
  Route,
  MapPin,
  LocateFixed,
  Loader2,
  X,
} from "lucide-react";

interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullLabel: string;
  lat: number;
  lon: number;
}

export default function TripCalculatorPage() {
  const { user, activeVehicle, logs } = useApp();

  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [loadingOriginSug, setLoadingOriginSug] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [loadingDestSug, setLoadingDestSug] = useState(false);

  const [fuelPrice, setFuelPrice] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);

  const [oneWayKm, setOneWayKm] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const originWrapRef = useRef<HTMLDivElement | null>(null);
  const destWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      setOrigin("");
      setOriginCoords(null);
      setDestination("");
      setDestCoords(null);
      setFuelPrice("");
      setRoundTrip(false);
      setOneWayKm(0);
      setErrorMsg("");
    }
  }, [user]);

  // Close dropdowns on outside tap/click
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (originWrapRef.current && !originWrapRef.current.contains(target)) {
        setShowOriginDropdown(false);
      }
      if (destWrapRef.current && !destWrapRef.current.contains(target)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  // Debounced Start Location autocomplete
  useEffect(() => {
    const q = origin.trim();
    if (q.length < 2 || originCoords !== null) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOriginSug(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setOriginSuggestions(Array.isArray(data?.results) ? data.results : []);
        setShowOriginDropdown(true);
      } catch {
        setOriginSuggestions([]);
      } finally {
        setLoadingOriginSug(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [origin, originCoords]);

  // Debounced Destination autocomplete
  useEffect(() => {
    const q = destination.trim();
    if (q.length < 2 || destCoords !== null) {
      setDestSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingDestSug(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setDestSuggestions(Array.isArray(data?.results) ? data.results : []);
        setShowDestDropdown(true);
      } catch {
        setDestSuggestions([]);
      } finally {
        setLoadingDestSug(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [destination, destCoords]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("GPS location is not supported on this browser.");
      return;
    }
    setLocatingGps(true);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `/api/places?lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          const place: PlaceSuggestion | undefined = data?.results?.[0];
          setOrigin(
            place?.fullLabel ||
              `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          );
          setOriginCoords({ lat: latitude, lon: longitude });
          setShowOriginDropdown(false);
        } catch {
          setOrigin(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setOriginCoords({ lat: latitude, lon: longitude });
        } finally {
          setLocatingGps(false);
        }
      },
      () => {
        setLocatingGps(false);
        setErrorMsg(
          "Location permission denied. Type a start location instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

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

  const resolveCoords = async (
    text: string,
    selected: { lat: number; lon: number } | null,
  ) => {
    if (selected) return selected;
    const res = await fetch(`/api/places?q=${encodeURIComponent(text)}`);
    const data = await res.json();
    const first: PlaceSuggestion | undefined = data?.results?.[0];
    if (first) return { lat: first.lat, lon: first.lon };
    return null;
  };

  const calculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setShowOriginDropdown(false);
    setShowDestDropdown(false);

    try {
      const [p1, p2] = await Promise.all([
        resolveCoords(origin, originCoords),
        resolveCoords(destination, destCoords),
      ]);

      if (!p1 || !p2) {
        setErrorMsg(
          "Could not locate one of those places. Select a suggestion from the dropdown.",
        );
        setLoading(false);
        return;
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${p1.lon},${p1.lat};${p2.lon},${p2.lat}?overview=false`;
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
  const numericFuelPrice = Math.max(0, Number(fuelPrice) || 0);
  const estimatedCost =
    fuelNeeded > 0 && numericFuelPrice > 0 ? fuelNeeded * numericFuelPrice : 0;

  const mapsUrl =
    origin.trim() && destination.trim()
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          origin,
        )}&destination=${encodeURIComponent(destination)}&travelmode=driving`
      : "https://www.google.com/maps";

  const inputClass =
    "w-full mt-1.5 px-3.5 py-2.5 pr-9 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0e84eb]/40";

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
          {/* Start Location with Live Maps Suggestions + GPS */}
          <div ref={originWrapRef} className="relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold">Start Location</label>
              <button
                type="button"
                disabled={locatingGps}
                onClick={handleUseCurrentLocation}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#025cbc] dark:text-[#3898ec] hover:opacity-80 cursor-pointer disabled:opacity-50"
              >
                {locatingGps ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LocateFixed className="w-3 h-3" />
                )}
                <span>Use GPS</span>
              </button>
            </div>

            <div className="relative">
              <input
                value={origin}
                onFocus={() => {
                  if (originSuggestions.length > 0) setShowOriginDropdown(true);
                }}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setOriginCoords(null);
                }}
                placeholder="Search start city or place"
                autoComplete="off"
                className={inputClass}
              />
              {loadingOriginSug ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 mt-0.5" />
              ) : origin ? (
                <button
                  type="button"
                  onClick={() => {
                    setOrigin("");
                    setOriginCoords(null);
                    setOriginSuggestions([]);
                  }}
                  aria-label="Clear start location"
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="glass-popover absolute left-0 right-0 z-40 mt-1.5 overflow-hidden divide-y divide-[var(--border-subtle)] max-h-56 overflow-y-auto">
                {originSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOrigin(item.fullLabel);
                      setOriginCoords({ lat: item.lat, lon: item.lon });
                      setShowOriginDropdown(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-white/20 dark:hover:bg-white/10 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#025cbc] dark:text-[#3898ec]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination with Live Maps Suggestions */}
          <div ref={destWrapRef} className="relative">
            <label className="block text-xs font-bold">Destination</label>
            <div className="relative">
              <input
                value={destination}
                onFocus={() => {
                  if (destSuggestions.length > 0) setShowDestDropdown(true);
                }}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setDestCoords(null);
                }}
                placeholder="Search destination city or place"
                autoComplete="off"
                className={inputClass}
              />
              {loadingDestSug ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 mt-0.5" />
              ) : destination ? (
                <button
                  type="button"
                  onClick={() => {
                    setDestination("");
                    setDestCoords(null);
                    setDestSuggestions([]);
                  }}
                  aria-label="Clear destination"
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="glass-popover absolute left-0 right-0 z-40 mt-1.5 overflow-hidden divide-y divide-[var(--border-subtle)] max-h-56 overflow-y-auto">
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDestination(item.fullLabel);
                      setDestCoords({ lat: item.lat, lon: item.lon });
                      setShowDestDropdown(false);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-white/20 dark:hover:bg-white/10 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#025cbc] dark:text-[#3898ec]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="text-xs font-bold">Fuel Rate (₹/Liter)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fuelPrice}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setFuelPrice(e.target.value.replace(/-/g, ""))}
              placeholder="Fuel rate in INR"
              className="w-full mt-1.5 px-3.5 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium focus:outline-none"
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
