import { NextResponse } from "next/server";

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  fullLabel: string;
  lat: number;
  lon: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // Reverse geocode via BigDataCloud (free, zero-key, instant from Vercel)
  if (lat && lon) {
    try {
      const revUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        lat,
      )}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
      const revRes = await fetch(revUrl);
      const revData = await revRes.json();
      const title =
        revData?.locality || revData?.city || "Current GPS Location";
      const subtitle = [
        revData?.city && revData.city !== title ? revData.city : null,
        revData?.principalSubdivision,
        revData?.countryName,
      ]
        .filter(Boolean)
        .join(", ");

      return NextResponse.json({
        results: [
          {
            id: `gps-${lat}-${lon}`,
            title,
            subtitle,
            fullLabel: subtitle ? `${title}, ${subtitle}` : title,
            lat: Number(lat),
            lon: Number(lon),
          },
        ],
      });
    } catch {
      return NextResponse.json({ results: [] });
    }
  }

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: PlaceSuggestion[] = [];
  const seen = new Set<string>();

  // 1. ArcGIS World Geocoder (handles exact schools, landmarks, highways & cities in India)
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
    // Continue to Open-Meteo fallback
  }

  // 2. Open-Meteo Geocoding API (fast global CDN for cities/towns)
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

  return NextResponse.json({ results: results.slice(0, 6) });
}