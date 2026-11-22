"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useApp } from "@/context/AppContext";
import { useDashboardTheme } from "@/hooks/useDashboardTheme";
import {
  Navigation,
  ExternalLink,
  Route,
  MapPin,
  LocateFixed,
  Loader2,
  X,
  Pencil,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";

interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullLabel: string;
  lat: number;
  lon: number;
}

interface Coords {
  lat: number;
  lon: number;
}

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function haversineRoadKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const straightKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  return Number((straightKm * 1.24).toFixed(1));
}

function formatDriveDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `~${Math.max(1, mins)} min`;
  if (mins === 0) return `~${hours} hr`;
  return `~${hours} hr ${mins} min`;
}

function latLonToWorldPixel(lat: number, lon: number, zoom: number) {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * scale;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clampedLat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale;
  return { x, y };
}

function computeFitZoom(
  points: Coords[],
  width: number,
  height: number,
): number {
  if (points.length < 2) return 11;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const pt of points) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lon < minLon) minLon = pt.lon;
    if (pt.lon > maxLon) maxLon = pt.lon;
  }

  const latDiff = Math.max(0.015, maxLat - minLat);
  const lonDiff = Math.max(0.015, maxLon - minLon);

  for (let z = 14; z >= 4; z--) {
    const p1 = latLonToWorldPixel(maxLat, minLon, z);
    const p2 = latLonToWorldPixel(minLat, maxLon, z);
    const spanW = Math.abs(p2.x - p1.x);
    const spanH = Math.abs(p2.y - p1.y);
    if (spanW <= width * 0.68 && spanH <= height * 0.62) {
      return z;
    }
  }

  return Math.max(
    4,
    Math.min(12, Math.round(8 - Math.log2(Math.max(latDiff, lonDiff)))),
  );
}

async function searchPlacesClient(query: string): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const results: PlaceSuggestion[] = [];
  const seen = new Set<string>();

  try {
    const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
      q,
    )}&countryCode=IND&maxLocations=6&outFields=PlaceName,Place_addr,City,Region&f=pjson`;
    const arcRes = await fetch(arcUrl);
    if (arcRes.ok) {
      const arcData = await arcRes.json();
      const candidates = Array.isArray(arcData?.candidates)
        ? arcData.candidates
        : [];
      for (const c of candidates) {
        const pLon = Number(c?.location?.x);
        const pLat = Number(c?.location?.y);
        if (!pLat || !pLon) continue;

        const addrStr = String(c?.address || "");
        const parts = addrStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const title = c?.attributes?.PlaceName || parts[0] || q;
        const subtitle =
          parts.slice(1).join(", ") ||
          [c?.attributes?.City, c?.attributes?.Region, "India"]
            .filter(Boolean)
            .join(", ");
        const fullLabel = subtitle ? `${title}, ${subtitle}` : title;
        const key = fullLabel.toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            id: `arc-${results.length}-${pLat.toFixed(4)}`,
            title,
            subtitle,
            fullLabel,
            lat: pLat,
            lon: pLon,
          });
        }
      }
    }
  } catch {
    // Fall through to Open-Meteo
  }

  if (results.length < 4) {
    try {
      const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q,
      )}&count=5&language=en&format=json`;
      const omRes = await fetch(omUrl);
      if (omRes.ok) {
        const omData = await omRes.json();
        const items = Array.isArray(omData?.results) ? omData.results : [];
        for (const item of items) {
          const pLat = Number(item.latitude);
          const pLon = Number(item.longitude);
          if (!pLat || !pLon) continue;
          const title = item.name || q;
          const subtitle = [item.admin2, item.admin1, item.country]
            .filter(Boolean)
            .join(", ");
          const fullLabel = subtitle ? `${title}, ${subtitle}` : title;
          const key = fullLabel.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              id: `om-${item.id || results.length}`,
              title,
              subtitle,
              fullLabel,
              lat: pLat,
              lon: pLon,
            });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return results.slice(0, 6);
}

export default function TripCalculatorPage() {
  const { user, activeVehicle, logs, theme } = useApp();
  const { enhancedTheme } = useDashboardTheme();

  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState<Coords | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>(
    [],
  );
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [loadingOriginSug, setLoadingOriginSug] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<Coords | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [loadingDestSug, setLoadingDestSug] = useState(false);

  const [fuelPrice, setFuelPrice] = useState("");
  const [isEditingFuelPrice, setIsEditingFuelPrice] = useState(false);
  const [roundTrip, setRoundTrip] = useState(false);

  const [oneWayKm, setOneWayKm] = useState<number>(0);
  const [oneWayDurationSec, setOneWayDurationSec] = useState<number>(0);
  const [routeLine, setRouteLine] = useState<Coords[]>([]);
  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const originWrapRef = useRef<HTMLDivElement | null>(null);
  const destWrapRef = useRef<HTMLDivElement | null>(null);
  const fuelInputRef = useRef<HTMLInputElement | null>(null);
  const mapDragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const vehicleFuelLogs = activeVehicle
    ? [...logs]
        .filter(
          (l) =>
            l.vehicle_id === activeVehicle.id &&
            l.type === "fuel" &&
            Number(l.amount) > 0 &&
            Number(l.fuel_liters || 0) > 0,
        )
        .sort((a, b) => {
          const dateCmp = String(b.date || "").localeCompare(
            String(a.date || ""),
          );
          if (dateCmp !== 0) return dateCmp;
          return Number(b.odo_reading || 0) - Number(a.odo_reading || 0);
        })
    : [];

  const latestFuelLog = vehicleFuelLogs[0] || null;
  const lastLoggedFuelRate = latestFuelLog
    ? Number(
        (
          Number(latestFuelLog.amount) / Number(latestFuelLog.fuel_liters)
        ).toFixed(2),
      )
    : null;

  useEffect(() => {
    if (!user) {
      setOrigin("");
      setOriginCoords(null);
      setDestination("");
      setDestCoords(null);
      setFuelPrice("");
      setIsEditingFuelPrice(false);
      setRoundTrip(false);
      setOneWayKm(0);
      setOneWayDurationSec(0);
      setRouteLine([]);
      setMapPan({ x: 0, y: 0 });
      setErrorMsg("");
      return;
    }

    if (!isEditingFuelPrice) {
      if (lastLoggedFuelRate !== null) {
        setFuelPrice(lastLoggedFuelRate.toFixed(2));
      } else {
        setFuelPrice("");
      }
    }
  }, [user, activeVehicle?.id, lastLoggedFuelRate, isEditingFuelPrice]);

  useEffect(() => {
    if (!origin.trim() && !destination.trim()) {
      setOneWayKm(0);
      setOneWayDurationSec(0);
      setRouteLine([]);
      setMapPan({ x: 0, y: 0 });
    }
  }, [origin, destination]);

  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (originWrapRef.current && !originWrapRef.current.contains(target)) {
        setShowOriginDropdown(false);
      }
      if (destWrapRef.current && !destWrapRef.current.contains(target)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  useEffect(() => {
    const q = origin.trim();
    if (q.length < 2 || originCoords !== null) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingOriginSug(true);
      const list = await searchPlacesClient(q);
      setOriginSuggestions(list);
      setShowOriginDropdown(list.length > 0);
      setLoadingOriginSug(false);
    }, 240);

    return () => clearTimeout(timer);
  }, [origin, originCoords]);

  useEffect(() => {
    const q = destination.trim();
    if (q.length < 2 || destCoords !== null) {
      setDestSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingDestSug(true);
      const list = await searchPlacesClient(q);
      setDestSuggestions(list);
      setShowDestDropdown(list.length > 0);
      setLoadingDestSug(false);
    }, 240);

    return () => clearTimeout(timer);
  }, [destination, destCoords]);

  const handleEnableManualFuelEdit = () => {
    setIsEditingFuelPrice(true);
    setTimeout(() => {
      fuelInputRef.current?.focus();
      fuelInputRef.current?.select();
    }, 20);
  };

  const handleResetToLastFuelRate = () => {
    setIsEditingFuelPrice(false);
    if (lastLoggedFuelRate !== null) {
      setFuelPrice(lastLoggedFuelRate.toFixed(2));
    } else {
      setFuelPrice("");
    }
  };

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
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const revData = await revRes.json();
          const title =
            revData?.locality || revData?.city || "Current GPS Location";
          const subtitle = [
            revData?.city && revData.city !== title ? revData.city : null,
            revData?.principalSubdivision,
          ]
            .filter(Boolean)
            .join(", ");
          setOrigin(subtitle ? `${title}, ${subtitle}` : title);
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

  const runRouteCalculation = useCallback(
    async (
      rawOrigin: string,
      rawOriginCoords: Coords | null,
      rawDest: string,
      rawDestCoords: Coords | null,
    ) => {
      if (!rawOrigin.trim() || !rawDest.trim()) return;
      setLoading(true);
      setErrorMsg("");
      setShowOriginDropdown(false);
      setShowDestDropdown(false);
      setMapPan({ x: 0, y: 0 });

      try {
        let p1 = rawOriginCoords;
        let p2 = rawDestCoords;

        if (!p1) {
          const list1 = await searchPlacesClient(rawOrigin);
          if (list1[0]) p1 = { lat: list1[0].lat, lon: list1[0].lon };
        }
        if (!p2) {
          const list2 = await searchPlacesClient(rawDest);
          if (list2[0]) p2 = { lat: list2[0].lat, lon: list2[0].lon };
        }

        if (!p1 || !p2) {
          setErrorMsg(
            "Could not locate one of those places. Pick a suggestion from the list.",
          );
          setLoading(false);
          return;
        }

        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${p1.lon},${p1.lat};${p2.lon},${p2.lat}?overview=full&geometries=geojson`;
          const routeRes = await fetch(osrmUrl);
          const routeData = await routeRes.json();
          const routeObj = routeData?.routes?.[0];

          if (routeObj?.distance) {
            const distKm = Number((routeObj.distance / 1000).toFixed(1));
            setOneWayKm(distKm);
            setOneWayDurationSec(
              typeof routeObj?.duration === "number" && routeObj.duration > 0
                ? routeObj.duration
                : Math.round((distKm / 45) * 3600),
            );
            const coords: Coords[] = Array.isArray(
              routeObj?.geometry?.coordinates,
            )
              ? routeObj.geometry.coordinates.map(
                  ([lon, lat]: [number, number]) => ({
                    lat,
                    lon,
                  }),
                )
              : [p1, p2];
            setRouteLine(coords);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to road-adjusted distance if OSRM is unreachable
        }

        const fallbackKm = haversineRoadKm(p1.lat, p1.lon, p2.lat, p2.lon);
        setOneWayKm(fallbackKm);
        setOneWayDurationSec(Math.round((fallbackKm / 45) * 3600));
        setRouteLine([p1, p2]);
      } catch {
        setErrorMsg("Route lookup failed. Please try again.");
      }
      setLoading(false);
    },
    [],
  );

  const calculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    await runRouteCalculation(origin, originCoords, destination, destCoords);
  };

  const handleSwapLocations = () => {
    if (!origin && !destination && !originCoords && !destCoords) return;

    const nextOrigin = destination;
    const nextOriginCoords = destCoords;
    const nextDest = origin;
    const nextDestCoords = originCoords;
    const hadActiveRoute = oneWayKm > 0 || routeLine.length >= 2;

    setOrigin(nextOrigin);
    setOriginCoords(nextOriginCoords);
    setDestination(nextDest);
    setDestCoords(nextDestCoords);
    setOriginSuggestions([]);
    setDestSuggestions([]);
    setShowOriginDropdown(false);
    setShowDestDropdown(false);
    setErrorMsg("");

    if (hadActiveRoute && nextOrigin.trim() && nextDest.trim()) {
      void runRouteCalculation(
        nextOrigin,
        nextOriginCoords,
        nextDest,
        nextDestCoords,
      );
    }
  };

  const handleClearRoute = () => {
    setOrigin("");
    setOriginCoords(null);
    setOriginSuggestions([]);
    setShowOriginDropdown(false);
    setDestination("");
    setDestCoords(null);
    setDestSuggestions([]);
    setShowDestDropdown(false);
    setOneWayKm(0);
    setOneWayDurationSec(0);
    setRouteLine([]);
    setMapPan({ x: 0, y: 0 });
    setErrorMsg("");
  };

  const totalDistance =
    oneWayKm > 0 ? (roundTrip ? oneWayKm * 2 : oneWayKm) : 0;
  const totalDurationLabel =
    oneWayDurationSec > 0
      ? formatDriveDuration(
          roundTrip ? oneWayDurationSec * 2 : oneWayDurationSec,
        )
      : "";
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

  const canEditFuel = isEditingFuelPrice || lastLoggedFuelRate === null;

  const mapViewWidth = 560;
  const mapViewHeight = 250;

  const mapData = useMemo(() => {
    const activePoints =
      routeLine.length >= 2
        ? routeLine
        : originCoords && destCoords
          ? [originCoords, destCoords]
          : originCoords
            ? [originCoords]
            : destCoords
              ? [destCoords]
              : [{ lat: 22.0667, lon: 87.9258 }];

    const zoom = computeFitZoom(activePoints, mapViewWidth, mapViewHeight);

    const worldPts = activePoints.map((pt) =>
      latLonToWorldPixel(pt.lat, pt.lon, zoom),
    );
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const wp of worldPts) {
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.y < minY) minY = wp.y;
      if (wp.y > maxY) maxY = wp.y;
    }

    const centerWorldX = (minX + maxX) / 2 - mapPan.x;
    const centerWorldY = (minY + maxY) / 2 - mapPan.y;

    const toScreen = (lat: number, lon: number) => {
      const wp = latLonToWorldPixel(lat, lon, zoom);
      return {
        x: wp.x - centerWorldX + mapViewWidth / 2,
        y: wp.y - centerWorldY + mapViewHeight / 2,
      };
    };

    const startScreen =
      routeLine.length >= 2
        ? toScreen(routeLine[0].lat, routeLine[0].lon)
        : originCoords
          ? toScreen(originCoords.lat, originCoords.lon)
          : null;

    const endScreen =
      routeLine.length >= 2
        ? toScreen(
            routeLine[routeLine.length - 1].lat,
            routeLine[routeLine.length - 1].lon,
          )
        : destCoords
          ? toScreen(destCoords.lat, destCoords.lon)
          : null;

    const screenPoints =
      routeLine.length >= 2
        ? routeLine.map((pt) => toScreen(pt.lat, pt.lon))
        : startScreen && endScreen
          ? [startScreen, endScreen]
          : [];

    const polylinePath =
      screenPoints.length >= 2
        ? screenPoints
            .map(
              (pt, idx) =>
                `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
            )
            .join(" ")
        : "";

    const returnPoints =
      screenPoints.length >= 2 && roundTrip
        ? [...screenPoints].reverse().map((pt, idx, arr) => {
            if (idx === 0 || idx === arr.length - 1) return pt;
            const prev = arr[idx - 1];
            const next = arr[idx + 1];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            return {
              x: pt.x + nx * 4.5,
              y: pt.y + ny * 4.5,
            };
          })
        : [];

    const returnPolylinePath =
      returnPoints.length >= 2
        ? returnPoints
            .map(
              (pt, idx) =>
                `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
            )
            .join(" ")
        : "";

    const tileSize = 256;
    const numTiles = Math.pow(2, zoom);
    const topLeftWorldX = centerWorldX - mapViewWidth / 2;
    const topLeftWorldY = centerWorldY - mapViewHeight / 2;

    const startTileX = Math.floor(topLeftWorldX / tileSize);
    const endTileX = Math.floor((topLeftWorldX + mapViewWidth) / tileSize);
    const startTileY = Math.floor(topLeftWorldY / tileSize);
    const endTileY = Math.floor((topLeftWorldY + mapViewHeight) / tileSize);

    const tiles: {
      key: string;
      url: string;
      left: number;
      top: number;
    }[] = [];

    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        if (ty < 0 || ty >= numTiles) continue;
        const wrappedX = ((tx % numTiles) + numTiles) % numTiles;
        const url = OSM_TILE_URL.replace("{z}", String(zoom))
          .replace("{x}", String(wrappedX))
          .replace("{y}", String(ty));

        tiles.push({
          key: `${zoom}-${wrappedX}-${ty}`,
          url,
          left: tx * tileSize - topLeftWorldX,
          top: ty * tileSize - topLeftWorldY,
        });
      }
    }

    return {
      tiles,
      polylinePath,
      returnPolylinePath,
      startScreen,
      endScreen,
      hasRoute: screenPoints.length >= 2 && totalDistance > 0,
    };
  }, [routeLine, originCoords, destCoords, mapPan, totalDistance, roundTrip]);

  const handleMapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    mapDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: mapPan.x,
      origY: mapPan.y,
    };
  };

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mapDragRef.current) return;
    const dx = e.clientX - mapDragRef.current.startX;
    const dy = e.clientY - mapDragRef.current.startY;
    setMapPan({
      x: mapDragRef.current.origX + dx,
      y: mapDragRef.current.origY + dy,
    });
  };

  const handleMapPointerUp = () => {
    mapDragRef.current = null;
  };

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

      {/* Map & Road Distance Trace on Top */}
      <div className="funky-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
          <span className="flex items-center gap-1.5">
            <Route className="w-4 h-4" /> Route Telemetry Trace
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] tabular-nums">
            {roundTrip ? "Round-Trip" : "One-Way"} • {totalDistance.toFixed(1)}{" "}
            km
            {totalDurationLabel ? ` • ${totalDurationLabel}` : ""}
          </span>
        </div>

        <div
          onPointerDown={handleMapPointerDown}
          onPointerMove={handleMapPointerMove}
          onPointerUp={handleMapPointerUp}
          onPointerCancel={handleMapPointerUp}
          className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--accent-secondary)] select-none cursor-grab active:cursor-grabbing touch-none"
        >
          <div
            className={`absolute inset-0 pointer-events-none ${
              theme === "dark" ? "invert hue-rotate-180 brightness-90" : ""
            }`}
          >
            {mapData.tiles.map((t) => (
              <img
                key={t.key}
                src={t.url}
                alt=""
                draggable={false}
                style={{
                  transform: `translate3d(${t.left}px, ${t.top}px, 0)`,
                  width: "256px",
                  height: "256px",
                }}
                className="absolute top-0 left-0 max-w-none"
              />
            ))}
          </div>

          <svg
            viewBox={`0 0 ${mapViewWidth} ${mapViewHeight}`}
            className="relative z-10 w-full h-full pointer-events-none"
          >
            <defs>
              <linearGradient
                id="routeTelemetryGrad"
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
            </defs>

            {mapData.returnPolylinePath && (
              <path
                d={mapData.returnPolylinePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray="6 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            )}

            {mapData.polylinePath && (
              <>
                <path
                  d={mapData.polylinePath}
                  fill="none"
                  stroke={
                    theme === "dark"
                      ? "rgba(15, 23, 42, 0.75)"
                      : "rgba(255, 255, 255, 0.85)"
                  }
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={mapData.polylinePath}
                  fill="none"
                  stroke={
                    enhancedTheme ? "url(#routeTelemetryGrad)" : "#0e84eb"
                  }
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {mapData.startScreen && (
              <g>
                <circle
                  cx={mapData.startScreen.x}
                  cy={mapData.startScreen.y}
                  r="6.5"
                  fill="#0e84eb"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                />
              </g>
            )}

            {mapData.endScreen && (
              <g>
                <circle
                  cx={mapData.endScreen.x}
                  cy={mapData.endScreen.y}
                  r="6.5"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                />
              </g>
            )}
          </svg>

          {mapData.hasRoute && (
            <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 flex-wrap pointer-events-none">
              <div className="px-2.5 py-1 rounded-full text-[11px] font-black tabular-nums backdrop-blur-md bg-white/85 dark:bg-slate-900/85 text-slate-900 dark:text-white border border-black/10 dark:border-white/15 shadow-sm">
                {totalDistance.toFixed(1)} km road distance
                {totalDurationLabel ? ` • ${totalDurationLabel}` : ""}
              </div>
              {roundTrip && (
                <div className="px-2 py-1 rounded-full text-[10px] font-extrabold backdrop-blur-md bg-amber-500/20 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/40 shadow-sm">
                  Outbound + Return
                </div>
              )}
            </div>
          )}

          {(mapPan.x !== 0 || mapPan.y !== 0) && (
            <button
              type="button"
              onClick={() => setMapPan({ x: 0, y: 0 })}
              className="absolute top-2.5 right-2.5 z-20 px-2.5 py-1 rounded-full text-[10px] font-extrabold backdrop-blur-md bg-white/85 dark:bg-slate-900/85 text-slate-900 dark:text-white border border-black/10 dark:border-white/15 cursor-pointer"
            >
              Center Route
            </button>
          )}
        </div>

        <div className="flex justify-between text-[11px] font-extrabold text-[var(--text-muted)]">
          <span>START: {origin.trim() ? origin.split(",")[0] : "—"}</span>
          <span>
            END: {destination.trim() ? destination.split(",")[0] : "—"}
          </span>
        </div>
      </div>

      {/* Summary Metrics Below Map */}
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
          <div className="text-[11px] font-bold text-[var(--text-muted)]">
            Fuel
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

      {/* Calculator Form Below */}
      <form onSubmit={calculateRoute} className="funky-card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="glass-popover absolute left-0 right-0 z-50 mt-1.5 overflow-hidden divide-y divide-[var(--border-subtle)] max-h-56 overflow-y-auto">
                {originSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
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

          <div ref={destWrapRef} className="relative">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold">Destination</label>
              <button
                type="button"
                onClick={handleSwapLocations}
                title="Swap Start & Destination"
                aria-label="Swap Start and Destination"
                className="inline-flex items-center justify-center p-0.5 text-[#025cbc] dark:text-[#3898ec] hover:opacity-80 transition cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
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
              <div className="glass-popover absolute left-0 right-0 z-50 mt-1.5 overflow-hidden divide-y divide-[var(--border-subtle)] max-h-56 overflow-y-auto">
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
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
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold">Fuel Rate (₹/Liter)</label>

              {lastLoggedFuelRate !== null &&
                (!isEditingFuelPrice ? (
                  <button
                    type="button"
                    onClick={handleEnableManualFuelEdit}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#025cbc] dark:text-[#3898ec] hover:opacity-80 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Rate</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetToLastFuelRate}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Use Last (₹{lastLoggedFuelRate.toFixed(2)})</span>
                  </button>
                ))}
            </div>

            <div className="relative">
              <input
                ref={fuelInputRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                readOnly={!canEditFuel}
                value={fuelPrice}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => setFuelPrice(e.target.value.replace(/-/g, ""))}
                placeholder="Fuel rate in INR"
                className={`w-full mt-1.5 px-3.5 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium focus:outline-none ${
                  !canEditFuel
                    ? "pr-24 opacity-90 cursor-default"
                    : "focus:ring-2 focus:ring-[#0e84eb]/40"
                }`}
              />

              {!canEditFuel && latestFuelLog && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] pointer-events-none">
                  Last fill
                </span>
              )}
            </div>
          </div>

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

          {(oneWayKm > 0 || origin.trim() || destination.trim()) && (
            <button
              type="button"
              onClick={handleClearRoute}
              className="funky-btn py-3 px-4 rounded-full bg-[var(--accent-secondary)] font-black text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
