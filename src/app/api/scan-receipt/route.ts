import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Demo fallback if GEMINI_API_KEY isn't set yet
      return NextResponse.json({
        amount: 1850,
        fuel_liters: 17.45,
        odo_reading: 14680,
        date: new Date().toISOString().split('T')[0],
        category: 'Fuel',
        notes: 'Demo AI Scan (Add GEMINI_API_KEY in .env.local for live OCR)',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { billBase64, billMime, odoBase64, odoMime, entryType } = await req.json();

    const parts: any[] = [];
    if (billBase64) {
      parts.push({ inlineData: { data: billBase64, mimeType: billMime || 'image/jpeg' } });
    }
    if (odoBase64) {
      parts.push({ inlineData: { data: odoBase64, mimeType: odoMime || 'image/jpeg' } });
    }

    const prompt = `
      Analyze the uploaded image(s) for a car tracking app in India (currency INR).
      Entry type hint: ${entryType}.
      Extract strictly as valid JSON (no markdown):
      {
        "amount": number or null,
        "fuel_liters": number or null,
        "odo_reading": number or null,
        "date": "YYYY-MM-DD" or null,
        "category": "Fuel" | "Accessories" | "Consumables" | "Service" | "Wash",
        "notes": string
      }
    `;
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
    });

    const rawText = response.text || '{}';
    const cleanedJson = rawText.replace(/```json|```/g, '').trim();
    return NextResponse.json(JSON.parse(cleanedJson));
  } catch (error) {
    console.error('AI Scan Error:', error);
    return NextResponse.json({ error: 'Failed to scan images' }, { status: 500 });
  }
}
