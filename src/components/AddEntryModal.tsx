"use client";

import React, { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import {
  X,
  Fuel,
  Receipt,
  Wrench,
  Droplets,
  Camera,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read photo file."));
    reader.readAsDataURL(file);
  });
}

async function prepareImageBase64(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 640;
        let { width, height } = img;

        if (!width || !height) {
          resolve(rawDataUrl);
          return;
        }

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.65);
        resolve(compressed && compressed.length > 50 ? compressed : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };

    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

function sanitizePositiveNumber(raw: string): string {
  if (raw === "") return "";
  const cleaned = raw.replace(/-/g, "");
  const num = Number(cleaned);
  if (Number.isNaN(num) || num < 0) return "";
  return cleaned;
}

export default function AddEntryModal({ isOpen, onClose }: Props) {
  const { activeVehicle, addLog } = useApp();
  const [entryType, setEntryType] = useState<
    "fuel" | "expense" | "service" | "wash"
  >("fuel");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [amount, setAmount] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [odoReading, setOdoReading] = useState("");
  const [category, setCategory] = useState("Accessories");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !activeVehicle) return null;

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setScanning(true);
    setScanStatus(null);

    try {
      const preparedBase64 = await prepareImageBase64(file);

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: preparedBase64,
          scanType: entryType,
        }),
      });

      const rawResponseText = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(rawResponseText);
      } catch {
        setScanStatus(
          res.status === 504
            ? "Scan timed out (504). Tap again to retry."
            : `Server error (${res.status}). Try again.`,
        );
        setScanning(false);
        return;
      }

      if (!res.ok || data.error) {
        setScanStatus(
          String(data.error || `Scan error (${res.status}). Try again.`),
        );
        setScanning(false);
        return;
      }

      let detectedAny = false;
      if (
        data.amount !== null &&
        data.amount !== undefined &&
        Number(data.amount) > 0
      ) {
        setAmount(String(data.amount));
        detectedAny = true;
      }
      if (
        data.fuel_liters !== null &&
        data.fuel_liters !== undefined &&
        Number(data.fuel_liters) > 0
      ) {
        setFuelLiters(String(data.fuel_liters));
        detectedAny = true;
      }
      if (
        data.odo_reading !== null &&
        data.odo_reading !== undefined &&
        Number(data.odo_reading) > 0
      ) {
        setOdoReading(String(data.odo_reading));
        detectedAny = true;
      }
      if (data.date && /^\d{4}-\d{2}-\d{2}$/.test(String(data.date))) {
        setDate(String(data.date));
        detectedAny = true;
      }
      if (data.notes) {
        setNotes(String(data.notes));
        detectedAny = true;
      }

      setScanStatus(
        detectedAny
          ? "Details auto-filled from photo!"
          : "No numbers detected — please enter manually.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setScanStatus(`Scan failed: ${msg}`);
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.max(0, Number(amount) || 0);
    if (numericAmount <= 0 && entryType !== "wash") return;

    await addLog({
      vehicle_id: activeVehicle.id,
      type: entryType,
      date,
      amount: numericAmount,
      fuel_liters:
        entryType === "fuel" && fuelLiters
          ? Math.max(0, Number(fuelLiters))
          : null,
      odo_reading: odoReading ? Math.max(0, Number(odoReading)) : null,
      category:
        entryType === "fuel"
          ? "Fuel"
          : entryType === "wash"
            ? "Wash"
            : entryType === "service"
              ? "Service"
              : category,
      notes: notes.trim(),
    });

    setAmount("");
    setFuelLiters("");
    setOdoReading("");
    setNotes("");
    setScanStatus(null);
    onClose();
  };

  const inputClass =
    "flex items-center w-full min-w-0 max-w-full h-11 mt-1.5 px-3.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium leading-none appearance-none focus:outline-none focus:ring-2 focus:ring-[#0e84eb]/40";

  const notePlaceholder =
    entryType === "fuel"
      ? "Enter fuel station or grade"
      : entryType === "expense"
        ? "Enter item or expense details"
        : entryType === "service"
          ? "Enter service details"
          : "Enter wash or detailing notes";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm overflow-y-auto">
      <div className="glass-modal w-full max-w-md p-5 sm:p-6 relative space-y-4 my-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-tight">Log Activity</h2>
            <p className="text-xs text-[var(--text-muted)] truncate">
              Vehicle: <strong>{activeVehicle.name}</strong> (
              {activeVehicle.plate || "IN12AB3456"})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Switcher */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "fuel", label: "Fuel", icon: Fuel },
            { id: "expense", label: "Expense", icon: Receipt },
            { id: "service", label: "Service", icon: Wrench },
            { id: "wash", label: "Wash", icon: Droplets },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                setEntryType(id as "fuel" | "expense" | "service" | "wash")
              }
              className={`py-2.5 px-1.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold cursor-pointer ${
                entryType === id
                  ? "funky-btn-primary"
                  : "funky-btn bg-[var(--accent-secondary)] text-[var(--text-main)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dual AI Scanner Buttons: Camera OR Gallery */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={scanning}
              onClick={() => cameraInputRef.current?.click()}
              className="funky-btn py-2.5 px-3 rounded-2xl bg-[var(--accent-secondary)] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {scanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Camera className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">
                {scanning ? "Scanning..." : "Take Photo"}
              </span>
            </button>

            <button
              type="button"
              disabled={scanning}
              onClick={() => galleryInputRef.current?.click()}
              className="funky-btn py-2.5 px-3 rounded-2xl bg-[var(--accent-secondary)] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">From Gallery</span>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptScan}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleReceiptScan}
            className="hidden"
          />

          {scanStatus && (
            <p className="text-[11px] font-bold text-center text-[#025cbc] dark:text-[#3898ec]">
              {scanStatus}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-bold">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-bold">Amount (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required={entryType !== "wash"}
                placeholder="Amount in INR"
                value={amount}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) =>
                  setAmount(sanitizePositiveNumber(e.target.value))
                }
                className={inputClass}
              />
            </div>
          </div>

          {entryType === "fuel" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-bold">
                  Fuel Volume (L)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  required
                  placeholder="Volume in L"
                  value={fuelLiters}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) =>
                    setFuelLiters(sanitizePositiveNumber(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-bold">Odometer (km)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  required
                  placeholder="Odometer km"
                  value={odoReading}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) =>
                    setOdoReading(sanitizePositiveNumber(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {entryType !== "fuel" && (
            <div className="grid grid-cols-2 gap-3">
              {entryType === "expense" && (
                <div className="min-w-0">
                  <label className="block text-xs font-bold">
                    Sub-Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="Accessories" className="bg-[var(--bg-main)]">
                      Accessories
                    </option>
                    <option value="Insurance" className="bg-[var(--bg-main)]">
                      Insurance
                    </option>
                    <option
                      value="Toll / FASTag"
                      className="bg-[var(--bg-main)]"
                    >
                      Toll / FASTag
                    </option>
                    <option value="Parking" className="bg-[var(--bg-main)]">
                      Parking
                    </option>
                    <option value="Repair" className="bg-[var(--bg-main)]">
                      Repair
                    </option>
                    <option value="Other" className="bg-[var(--bg-main)]">
                      Other
                    </option>
                  </select>
                </div>
              )}
              <div
                className={
                  entryType === "expense" ? "min-w-0" : "col-span-2 min-w-0"
                }
              >
                <label className="block text-xs font-bold">
                  Odometer (optional)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Odometer km"
                  value={odoReading}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) =>
                    setOdoReading(sanitizePositiveNumber(e.target.value))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="min-w-0">
            <label className="block text-xs font-bold">
              Notes / Item Details
            </label>
            <input
              type="text"
              placeholder={notePlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="funky-btn-primary w-full py-3 rounded-full font-black text-sm mt-2 cursor-pointer"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
}
