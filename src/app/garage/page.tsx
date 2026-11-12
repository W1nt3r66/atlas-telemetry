"use client";

import React, { useState } from "react";
import {
  useApp,
  PowertrainType,
  WheelerType,
  Vehicle,
} from "@/context/AppContext";
import {
  Warehouse,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  CheckCircle2,
} from "lucide-react";

// Validates Indian State Plates (e.g., WB02AB1234, MH12DE1433) and Bharat Series Plates (e.g., 25BH0980T)
const INDIAN_PLATE_REGEX =
  /^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}|[0-9]{2}BH[0-9]{4}[A-Z]{1,2})$/;

function isValidIndianPlate(raw: string): boolean {
  const cleaned = raw.replace(/[\s-]/g, "").toUpperCase();
  return INDIAN_PLATE_REGEX.test(cleaned);
}

export default function GaragePage() {
  const {
    vehicles,
    activeVehicle,
    setActiveVehicleId,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  } = useApp();

  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [year, setYear] = useState("");
  const [serviceInterval, setServiceInterval] = useState("");
  const [fuelType, setFuelType] = useState<PowertrainType>("Petrol");
  const [wheelerType, setWheelerType] = useState<WheelerType>("4-Wheeler");
  const [initialOdo, setInitialOdo] = useState("");
  const [lastServiceOdo, setLastServiceOdo] = useState("");
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editServiceInterval, setEditServiceInterval] = useState("10000");
  const [editError, setEditError] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanName = name.trim();
    const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();
    const cleanMake = manufacturer.trim();

    if (
      !cleanName ||
      !cleanPlate ||
      !cleanMake ||
      !year.trim() ||
      !serviceInterval.trim() ||
      !initialOdo.trim() ||
      !lastServiceOdo.trim()
    ) {
      setFormError("All fields are mandatory. Please complete every field.");
      return;
    }

    if (!isValidIndianPlate(cleanPlate)) {
      setFormError(
        "Enter a valid Indian State plate (e.g., WB02AB1234) or BH series plate (e.g., 25BH0980T).",
      );
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    await addVehicle({
      name: cleanName,
      plate: cleanPlate,
      manufacturer: cleanMake,
      year: Number(year),
      fuel_type: fuelType,
      wheeler_type: wheelerType,
      initial_odo: Number(initialOdo),
      service_interval_km: Number(serviceInterval),
      service_interval_days: 365,
      last_service_odo: Number(lastServiceOdo),
      last_service_date: today,
      last_wash_date: today,
    });

    setName("");
    setPlate("");
    setManufacturer("");
    setYear("");
    setServiceInterval("");
    setInitialOdo("");
    setLastServiceOdo("");
    triggerToast("Added to garage!");
  };

  const startEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditPlate(v.plate);
    setEditServiceInterval(String(v.service_interval_km || 10000));
    setEditError("");
  };

  const saveEdit = (id: string) => {
    setEditError("");
    const cleanName = editName.trim();
    const cleanPlate = editPlate.replace(/[\s-]/g, "").toUpperCase();

    if (!cleanName || !cleanPlate || !editServiceInterval.trim()) {
      setEditError("All fields are required.");
      return;
    }

    if (!isValidIndianPlate(cleanPlate)) {
      setEditError("Invalid Indian State or BH number plate.");
      return;
    }

    updateVehicle(id, {
      name: cleanName,
      plate: cleanPlate,
      service_interval_km: Number(editServiceInterval),
    });
    setEditingId(null);
    triggerToast("Vehicle modified!");
  };

  const inputClass =
    "w-full mt-1.5 px-3.5 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-sm font-medium focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Floating Pop-Up Toast on Add / Modify */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 glass-modal px-4 py-3 shadow-2xl flex items-center gap-2 text-xs font-black animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Warehouse className="w-6 h-6" /> My Garage
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          Swipe sideways across your vehicles below or add a new
          Indian-registered vehicle.
        </p>
      </div>

      {/* Swipeable Horizontal Vehicle Carousel */}
      {vehicles.length > 0 && (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar">
          {vehicles.map((v) => {
            const isActive = activeVehicle?.id === v.id;
            const isEditing = editingId === v.id;

            return (
              <div
                key={v.id}
                className={`funky-card p-5 space-y-3 shrink-0 w-[285px] sm:w-[320px] snap-start ${
                  isActive ? "ring-2 ring-[var(--accent-primary)]" : ""
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2.5">
                    <input
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Vehicle Nickname"
                      className={inputClass}
                    />
                    <input
                      required
                      value={editPlate}
                      onChange={(e) =>
                        setEditPlate(e.target.value.toUpperCase())
                      }
                      placeholder="WB02AB1234 or 25BH0980T"
                      className={inputClass}
                    />
                    <input
                      required
                      type="number"
                      value={editServiceInterval}
                      onChange={(e) => setEditServiceInterval(e.target.value)}
                      placeholder="Service Interval (km)"
                      className={inputClass}
                    />
                    {editError && (
                      <p className="text-[11px] font-bold text-red-500">
                        {editError}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => saveEdit(v.id)}
                        className="funky-btn-primary px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="funky-btn px-3 py-1.5 rounded-full bg-[var(--accent-secondary)] text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-[var(--text-muted)] truncate">
                          {v.plate || "NO PLATE"} • {v.fuel_type}
                        </div>
                        <h3 className="text-lg font-black truncate">
                          {v.name}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {v.manufacturer || v.wheeler_type} • {v.year}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(v)}
                          title="Edit Vehicle"
                          className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${v.name} from your garage?`)) {
                              deleteVehicle(v.id);
                              triggerToast("Vehicle removed");
                            }
                          }}
                          title="Delete Vehicle"
                          className="funky-btn p-2 rounded-full bg-[var(--accent-secondary)] text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
                      <span className="text-[var(--text-muted)]">
                        Every{" "}
                        {(v.service_interval_km || 10000).toLocaleString()} km
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveVehicleId(v.id)}
                        className={`px-3 py-1 rounded-full font-extrabold cursor-pointer ${
                          isActive
                            ? "funky-btn-primary"
                            : "funky-btn bg-[var(--accent-secondary)]"
                        }`}
                      >
                        {isActive ? "Active" : "Select"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Locked Full-Width Add New Vehicle Form (All Fields Mandatory + Indian State/BH Validation) */}
      <form
        onSubmit={handleAddVehicle}
        className="funky-card w-full p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Vehicle
          </h2>
          <span className="text-[11px] font-bold text-[var(--text-muted)]">
            All fields required
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">i. Vehicle Nickname *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Commuter"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold">
              ii. Indian Number Plate (State or BH) *
            </label>
            <input
              required
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="e.g., MH01AB1234 or 25BH0980T"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">
              iii. Manufacturer / Model *
            </label>
            <input
              required
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g., Honda City"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold">iv. Year *</label>
            <input
              required
              type="number"
              min="1980"
              max="2030"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2024"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">
              v. Service Interval (km) *
            </label>
            <input
              required
              type="number"
              min="500"
              value={serviceInterval}
              onChange={(e) => setServiceInterval(e.target.value)}
              placeholder="e.g., 10000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold">
              vi. Fuel Type or Electric *
            </label>
            <select
              required
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as PowertrainType)}
              className={inputClass}
            >
              {(
                [
                  "Petrol",
                  "Diesel",
                  "CNG",
                  "Hybrid",
                  "Electric",
                ] as PowertrainType[]
              ).map((ft) => (
                <option key={ft} value={ft} className="bg-[var(--bg-main)]">
                  {ft}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold">vii. Vehicle Category *</label>
          <div className="grid grid-cols-3 gap-2.5 mt-1.5">
            {(["2-Wheeler", "3-Wheeler", "4-Wheeler"] as WheelerType[]).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setWheelerType(cat)}
                  className={`py-2.5 rounded-full text-xs font-extrabold cursor-pointer ${
                    wheelerType === cat
                      ? "funky-btn-primary"
                      : "funky-btn bg-[var(--accent-secondary)]"
                  }`}
                >
                  {cat}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">
              viii. Current Odometer (km) *
            </label>
            <input
              required
              type="number"
              min="0"
              value={initialOdo}
              onChange={(e) => setInitialOdo(e.target.value)}
              placeholder="e.g., 15000"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-bold">
              ix. Last Service Odometer (km) *
            </label>
            <input
              required
              type="number"
              min="0"
              value={lastServiceOdo}
              onChange={(e) => setLastServiceOdo(e.target.value)}
              placeholder="e.g., 10000"
              className={inputClass}
            />
          </div>
        </div>

        {formError && (
          <p className="text-xs font-bold text-red-500">{formError}</p>
        )}

        <button
          type="submit"
          className="funky-btn-primary px-6 py-3 rounded-full font-black text-xs cursor-pointer"
        >
          Add Vehicle to Garage
        </button>
      </form>
    </div>
  );
}
