"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import {
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Pencil,
  X,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function OwnerPage() {
  const { user, owner, updateOwner, deleteAccount } = useApp();

  const [fullName, setFullName] = useState(owner.fullName || "");
  const [email, setEmail] = useState(owner.email || user?.email || "");
  const [phone, setPhone] = useState(owner.phone || "");
  const [city, setCity] = useState(owner.city || "");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hasSavedDetails = Boolean(
    (owner.fullName && owner.fullName.trim()) ||
    (owner.phone && owner.phone.trim()) ||
    (owner.city && owner.city.trim()),
  );

  const [isEditing, setIsEditing] = useState<boolean>(!hasSavedDetails);

  useEffect(() => {
    const nextName = owner.fullName || "";
    const nextEmail = owner.email || user?.email || "";
    const nextPhone = owner.phone || "";
    const nextCity = owner.city || "";

    setFullName(nextName);
    setEmail(nextEmail);
    setPhone(nextPhone);
    setCity(nextCity);

    const anySaved = Boolean(
      nextName.trim() || nextPhone.trim() || nextCity.trim(),
    );
    setIsEditing(!anySaved);
  }, [owner, user]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwner({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
    });
    setIsEditing(false);
    triggerToast("Owner profile saved!");
  };

  const handleCancelEdit = () => {
    setFullName(owner.fullName || "");
    setEmail(owner.email || user?.email || "");
    setPhone(owner.phone || "");
    setCity(owner.city || "");
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      "Are you sure you want to permanently wipe your Atlas garage data and sign out?",
    );
    if (!confirmed) return;
    await deleteAccount();
  };

  const inputClass =
    "w-full mt-1.5 px-3.5 py-2.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] text-[16px] sm:text-sm font-medium focus:outline-none";

  const displayEmail = owner.email || user?.email || "—";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 glass-popover px-4 py-3 flex items-center gap-2 text-xs font-black animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black">Owner &amp; Cloud Profile</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Manage your driver details synced across devices via Google Sign-In.
        </p>
      </div>

      <div className="funky-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="funky-btn-primary w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-[var(--text-muted)]">
              ATLAS SYNC ID
            </div>
            <div className="text-base font-black tracking-wide">
              {owner.syncId || "ATL-ACTIVE"}
            </div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-[var(--accent-secondary)] border border-[var(--border-color)] text-xs font-extrabold">
          {user?.email || "Signed In"}
        </span>
      </div>

      {!isEditing && hasSavedDetails ? (
        <div className="funky-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base">Driver Details</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-400/40">
                <CheckCircle2 className="w-3 h-3" /> Saved
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="funky-btn px-3.5 py-1.5 rounded-full bg-[var(--accent-secondary)] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-secondary)]/75 border border-[var(--border-color)] space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <User className="w-3 h-3" /> Full Name
              </div>
              <div className="text-sm font-black">{owner.fullName || "—"}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--accent-secondary)]/75 border border-[var(--border-color)] space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email Address
              </div>
              <div className="text-sm font-black break-all">{displayEmail}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--accent-secondary)]/75 border border-[var(--border-color)] space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Phone Number
              </div>
              <div className="text-sm font-black tabular-nums">
                {owner.phone || "—"}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--accent-secondary)]/75 border border-[var(--border-color)] space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Base
              </div>
              <div className="text-sm font-black">{owner.city || "—"}</div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveProfile} className="funky-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-black text-base">Driver Details</h2>
            {hasSavedDetails && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="funky-btn px-3 py-1.5 rounded-full bg-[var(--accent-secondary)] text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-bold">Home City / Hub</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city name"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            className="funky-btn-primary px-6 py-3 rounded-full font-black text-xs cursor-pointer"
          >
            Save Profile
          </button>
        </form>
      )}

      <div className="funky-card p-6 space-y-3 border-red-400/30">
        <h2 className="font-black text-sm text-red-500">Danger Zone</h2>
        <p className="text-xs text-[var(--text-muted)]">
          Permanently clear all synced vehicles and logs from your cloud account
          and sign out.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="funky-btn px-4 py-2.5 rounded-full bg-red-500/15 text-red-500 border-red-400/40 font-black text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Cloud Garage &amp; Sign Out
        </button>
      </div>

      <p className="text-center text-[11px] font-semibold tracking-wide text-[var(--text-muted)] pt-2">
        Motorly is now Atlas &bull; v2.0.2
      </p>
    </div>
  );
}
