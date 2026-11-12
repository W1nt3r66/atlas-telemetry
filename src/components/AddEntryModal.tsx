"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  X,
  Fuel,
  Receipt,
  Wrench,
  Droplets,
  Sparkles,
  Upload,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
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

  if (!isOpen || !activeVehicle) return null;

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await fetch("/api/ocr-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: reader.result,
            scanType: entryType,
          }),
        });
        const data = await res.json();
        if (data.amount) setAmount(String(data.amount));
        if (data.fuel_liters) setFuelLiters(String(data.fuel_liters));
        if (data.odo_reading) setOdoReading(String(data.odo_reading));
        if (data.date) setDate(data.date);
        if (data.notes) setNotes(data.notes);
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount && entryType !== "wash") return;

    await addLog({
      vehicle_id: activeVehicle.id,
      type: entryType,
      date,
      amount: Number(amount) || 0,
      fuel_liters:
        entryType === "fuel" && fuelLiters ? Number(fuelLiters) : null,
      odo_reading: odoReading ? Number(odoReading) : null,
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
    onClose();
  };

  const inputClass =
    "w-full mt-1 px-3.5 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40";

  const notePlaceholder =
    entryType === "fuel"
      ? "e.g., Shell V-Power Full Tank"
      : entryType === "expense"
        ? "e.g., Amazon Microfiber Cloth / Dashcam"
        : entryType === "service"
          ? "e.g., Periodic Oil & Filter Change"
          : "e.g., Foam Wash & Underbody Rinse";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-modal w-full max-w-md p-6 relative space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Log Activity</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Vehicle: <strong>{activeVehicle.name}</strong> (
              {activeVehicle.plate})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
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
              className={`funky-btn py-2.5 px-2 rounded-2xl flex flex-col items-center gap-1 text-xs font-extrabold cursor-pointer ${
                entryType === id
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--accent-secondary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* AI Receipt / Odometer Photo Upload */}
        <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--accent-secondary)]/60 cursor-pointer text-xs font-extrabold hover:opacity-90 transition">
          <Upload className="w-4 h-4" />
          <span>
            {scanning
              ? "Scanning Receipt with AI..."
              : "Scan Receipt or Odometer Photo"}
          </span>
          <Sparkles className="w-3.5 h-3.5" />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptScan}
            className="hidden"
          />
        </label>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                required={entryType !== "wash"}
                placeholder="1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {entryType === "fuel" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold">
                  Fuel Volume (Liters)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="14.5"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-bold">Odometer (km)</label>
                <input
                  type="number"
                  required
                  placeholder="14560"
                  value={odoReading}
                  onChange={(e) => setOdoReading(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {entryType !== "fuel" && (
            <div className="grid grid-cols-2 gap-3">
              {entryType === "expense" && (
                <div>
                  <label className="text-xs font-bold">Sub-Category</label>
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
              <div className={entryType === "expense" ? "" : "col-span-2"}>
                <label className="text-xs font-bold">Odometer (optional)</label>
                <input
                  type="number"
                  placeholder="14560"
                  value={odoReading}
                  onChange={(e) => setOdoReading(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold">Notes / Item Details</label>
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
            className="funky-btn w-full py-3 rounded-full bg-[var(--accent-primary)] text-white font-black text-sm mt-2 cursor-pointer"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
}
