import { useEffect, useState } from "react";

export interface WashWeatherSnapshot {
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  upcomingRainMm: number;
  fetchedAt: number;
  coords?: {
    latitude: number;
    longitude: number;
  };
}

export interface WashScheduleResult {
  intervalDays: number;
  seasonLabel: string;
  rustTip: string;
  source: "gps-weather" | "seasonal-fallback";
}

const WEATHER_CACHE_KEY = "atlas_live_wash_weather_v1";
const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function getTamlukWashIntervalDays(
  date = new Date(),
  weather?: WashWeatherSnapshot | null,
): WashScheduleResult {
  if (weather && !Number.isNaN(weather.humidityPct)) {
    const isRainingNow = (weather.precipitationMm || 0) >= 0.3;
    const isRainExpected = (weather.upcomingRainMm || 0) >= 4;

    if (isRainingNow || isRainExpected) {
      return {
        intervalDays: 16,
        seasonLabel: `Live Rain (${Math.round(weather.temperatureC)}°C)`,
        rustTip:
          "Rain or wet roads detected nearby—skip full wash during downpours and rinse wheel arches/sills once clear.",
        source: "gps-weather",
      };
    }

    if (weather.humidityPct >= 80) {
      return {
        intervalDays: 21,
        seasonLabel: `Humid ${Math.round(weather.humidityPct)}%`,
        rustTip:
          "High local humidity—keep washes to ~3 weeks and dry door sills & wheel arches thoroughly.",
        source: "gps-weather",
      };
    }

    if (weather.humidityPct <= 45 && (weather.precipitationMm || 0) === 0) {
      return {
        intervalDays: 25,
        seasonLabel: `Dry ${Math.round(weather.humidityPct)}% RH`,
        rustTip:
          "Dry air & low moisture—use a gentle dry microfiber duster for road dust before doing a full water wash.",
        source: "gps-weather",
      };
    }

    return {
      intervalDays: 30,
      seasonLabel: `Clear ${Math.round(weather.temperatureC)}°C`,
      rustTip:
        "Moderate local conditions—stick to a ~30-day wash cadence and park out of direct sun when possible.",
      source: "gps-weather",
    };
  }

  const month = date.getMonth() + 1;

  if (month >= 6 && month <= 9) {
    return {
      intervalDays: 21,
      seasonLabel: "Monsoon (Coastal Humid)",
      rustTip:
        "Avoid frequent washes; dry door sills & wheel arches after rain to stop rust.",
      source: "seasonal-fallback",
    };
  }
  if (month >= 11 || month <= 2) {
    return {
      intervalDays: 25,
      seasonLabel: "Winter Dry",
      rustTip:
        "Use a dry microfiber duster for NH116 highway dust instead of water.",
      source: "seasonal-fallback",
    };
  }
  return {
    intervalDays: 30,
    seasonLabel: "Summer Sea-Breeze",
    rustTip:
      "High coastal humidity—keep washes to once a month and park under shade.",
    source: "seasonal-fallback",
  };
}

function readCachedWeather(): WashWeatherSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WashWeatherSnapshot;
    if (!parsed || typeof parsed.fetchedAt !== "number") return null;
    if (Date.now() - parsed.fetchedAt > WEATHER_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedWeather(snapshot: WashWeatherSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function getCurrentPositionCoords(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: WEATHER_CACHE_TTL_MS,
      },
    );
  });
}

export async function fetchLiveWashWeather(
  forceRefresh = false,
): Promise<WashWeatherSnapshot | null> {
  if (!forceRefresh) {
    const cached = readCachedWeather();
    if (cached) return cached;
  }

  try {
    const coords = await getCurrentPositionCoords();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(coords.latitude.toFixed(4))}` +
      `&longitude=${encodeURIComponent(coords.longitude.toFixed(4))}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation` +
      `&hourly=precipitation` +
      `&forecast_days=2&timezone=auto`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return readCachedWeather();

    const data = await res.json();
    const current = data?.current || {};
    const hourlyPrecip: number[] = Array.isArray(data?.hourly?.precipitation)
      ? data.hourly.precipitation
          .slice(0, 24)
          .map((n: unknown) => Number(n) || 0)
      : [];

    const upcomingRainMm = hourlyPrecip.reduce((sum, mm) => sum + mm, 0);

    const snapshot: WashWeatherSnapshot = {
      temperatureC: Number(current.temperature_2m ?? 26),
      humidityPct: Number(current.relative_humidity_2m ?? 65),
      precipitationMm: Number(current.precipitation ?? 0),
      upcomingRainMm,
      fetchedAt: Date.now(),
      coords,
    };

    writeCachedWeather(snapshot);
    return snapshot;
  } catch {
    return readCachedWeather();
  }
}

export function useLiveWashWeather(): WashWeatherSnapshot | null {
  const [weather, setWeather] = useState<WashWeatherSnapshot | null>(() =>
    readCachedWeather(),
  );

  useEffect(() => {
    let active = true;
    void fetchLiveWashWeather(false).then((data) => {
      if (active && data) {
        setWeather(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return weather;
}

export function calculateMaintenanceStatus(
  vehicle: any,
  currentOdo: number,
  liveWeather?: WashWeatherSnapshot | null,
) {
  const today = new Date();
  const effectiveWeather = liveWeather ?? readCachedWeather();

  const lastWash = new Date(vehicle?.last_wash_date || today);
  const { intervalDays, seasonLabel, rustTip, source } =
    getTamlukWashIntervalDays(today, effectiveWeather);
  const daysSinceWash = Math.max(
    0,
    Math.floor((today.getTime() - lastWash.getTime()) / (1000 * 3600 * 24)),
  );
  const washDaysLeft = intervalDays - daysSinceWash;

  const lastServiceDate = new Date(vehicle?.last_service_date || today);
  const daysSinceService = Math.max(
    0,
    Math.floor(
      (today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24),
    ),
  );
  const serviceDaysLeft =
    (vehicle?.service_interval_days || 365) - daysSinceService;

  const kmSinceService = Math.max(
    0,
    currentOdo - (vehicle?.last_service_odo || 0),
  );
  const serviceKmLeft =
    (vehicle?.service_interval_km || 10000) - kmSinceService;

  return {
    washDaysLeft,
    washInterval: intervalDays,
    seasonLabel,
    rustTip,
    washScheduleSource: source,
    serviceDaysLeft,
    serviceKmLeft,
    isWashDue: washDaysLeft <= 3,
    isServiceDue: serviceDaysLeft <= 15 || serviceKmLeft <= 500,
  };
}
