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
    const prompt = `
      You are an OCR parser for a vehicle telemetry app in India (currency INR, distance in km, fuel in liters).
      The uploaded photo can be a fuel pump receipt, an invoice/bill, a UPI payment screenshot, OR a car instrument cluster / digital odometer display.
      Entry type hint: "${hint}".

      Rules:
      - If it is a fuel receipt/bill: extract total paid INR as "amount", fuel volume in liters as "fuel_liters", receipt date as "YYYY-MM-DD", and pump/station or item summary as "notes".
      - If it is a car dashboard / odometer photo: extract the main total odometer reading (ignore Trip A / Trip B if total ODO is shown) as "odo_reading" (integer/number).
      - If both or partial info are visible, extract everything visible and leave unseen fields as null.

      Return strictly valid JSON with these exact keys:
      {
        "amount": number | null,
        "fuel_liters": number | null,
        "odo_reading": number | null,
        "date": "YYYY-MM-DD" | null,
        "category": "Fuel" | "Accessories" | "Insurance" | "Toll / FASTag" | "Parking" | "Repair" | "Service" | "Wash" | "Other",
        "notes": string | null
      }
    `;
    parts.push({ text: prompt });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("AI Scan Error:", error);
    const message =
      error instanceof Error ? error.message : "Gemini failed to scan photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
