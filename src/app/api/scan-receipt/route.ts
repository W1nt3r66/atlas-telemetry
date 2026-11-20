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

  // Reverse geocode when user taps "Use Current GPS"
  if (lat && lon) {
    try {
      const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lon)}&zoom=14`;
      const revRes = await fetch(revUrl, {
        headers: { "User-Agent": "AtlasTelemetryApp/2.0" },
      });
      const revData = await revRes.json();
      const addr = revData?.address || {};
      const title =
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.town ||
        addr.city ||
        revData?.name ||
        "Current Location";
      const subtitle = [
        addr.city || addr.town || addr.state_district,
        addr.state,
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

  try {
    // Photon API (fast autocomplete biased toward India center 22.5, 79.0)
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q,
    )}&limit=6&lat=22.5&lon=79.0&lang=en`;
    const res = await fetch(photonUrl, {
      headers: { "User-Agent": "AtlasTelemetryApp/2.0" },
    });

    if (res.ok) {
      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      const seen = new Set<string>();
      const results: PlaceSuggestion[] = [];

      for (const f of features) {
        const props = f?.properties || {};
        const coords = f?.geometry?.coordinates || [];
        const pLon = Number(coords[0]);
        const pLat = Number(coords[1]);
        if (!pLat || !pLon) continue;

        const title =
          props.name || props.street || props.city || props.district || q;
        const subParts = [
          props.city && props.city !== title ? props.city : null,
          props.district && props.district !== title ? props.district : null,
          props.state,
          props.country,
        ].filter(Boolean);
        const subtitle = subParts.join(", ");
        const fullLabel = subtitle ? `${title}, ${subtitle}` : title;

        const key = fullLabel.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          id: `${props.osm_id || results.length}-${pLat.toFixed(4)}`,
          title,
          subtitle,
          fullLabel,
          lat: pLat,
          lon: pLon,
        });
      }

      if (results.length > 0) {
        return NextResponse.json({ results });
      }
    }
  } catch {
    // Fall through to Nominatim fallback
  }

  // Fallback to Nominatim search
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(
      q,
    )}`;
    const nomRes = await fetch(nomUrl, {
      headers: { "User-Agent": "AtlasTelemetryApp/2.0" },
    });
    const nomData = await nomRes.json();
    const results: PlaceSuggestion[] = (
      Array.isArray(nomData) ? nomData : []
    ).map((item: any, idx: number) => {
      const parts = String(item.display_name || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const title = parts[0] || q;
      const subtitle = parts.slice(1, 4).join(", ");
      return {
        id: String(item.place_id || idx),
        title,
        subtitle,
        fullLabel: subtitle ? `${title}, ${subtitle}` : title,
        lat: Number(item.lat),
        lon: Number(item.lon),
      };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
