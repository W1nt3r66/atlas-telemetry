import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 30;

function parseDataUrl(input?: string | null, fallbackMime = "image/jpeg") {
  if (!input) return null;
  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: fallbackMime, data: input };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in Vercel Environment Variables." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      imageBase64,
      scanType,
      billBase64,
      billMime,
      odoBase64,
      odoMime,
      entryType,
    } = body;

    const parts: Array<
      { inlineData: { data: string; mimeType: string } } | { text: string }
    > = [];

    const singleImg = parseDataUrl(imageBase64);
    if (singleImg) parts.push({ inlineData: singleImg });

    const billImg = parseDataUrl(billBase64, billMime || "image/jpeg");
    if (billImg) parts.push({ inlineData: billImg });

    const odoImg = parseDataUrl(odoBase64, odoMime || "image/jpeg");
    if (odoImg) parts.push({ inlineData: odoImg });

    if (parts.length === 0) {
      return NextResponse.json(
        { error: "No image data received by server." },
        { status: 400 },
      );
    }

    const hint = scanType || entryType || "fuel";
    const prompt = `Extract vehicle log fields from this Indian receipt/UPI/odometer image (hint: ${hint}). Return strictly JSON: {"amount":number|null,"fuel_liters":number|null,"odo_reading":number|null,"date":"YYYY-MM-DD"|null,"category":"Fuel"|"Accessories"|"Insurance"|"Toll / FASTag"|"Parking"|"Repair"|"Service"|"Wash"|"Other","notes":string|null}`;
    parts.push({ text: prompt });

    const ai = new GoogleGenAI({ apiKey });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: parts,
        config: {
          responseMimeType: "application/json",
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
          abortSignal: controller.signal,
        },
      });
      clearTimeout(timeoutId);

      const rawText = response.text || "{}";
      const cleanedJson = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      return NextResponse.json(parsed);
    } catch (err) {
      clearTimeout(timeoutId);
      const rawMsg =
        err instanceof Error ? err.message : "Gemini failed to scan photo.";

      if (rawMsg.toLowerCase().includes("abort")) {
        return NextResponse.json(
          { error: "Scan timed out. Tap once more to retry." },
          { status: 504 },
        );
      }
      if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE")) {
        return NextResponse.json(
          {
            error: "Gemini is momentarily busy (503). Tap again in 3 seconds.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: rawMsg }, { status: 500 });
    }
  } catch (error) {
    console.error("AI Scan Error:", error);
    const message =
      error instanceof Error ? error.message : "Gemini failed to scan photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
