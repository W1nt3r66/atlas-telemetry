"use client";

import React, { useState, useEffect } from "react";

export type VehicleAvatarKey =
  | "BondJames"
  | "ForzaCyber"
  | "HuntingSeason"
  | "Jump2Future"
  | "MericaMuscle"
  | "PrinceofCalcutta";

export interface AvatarPreset {
  key: VehicleAvatarKey;
  title: string;
  subtitle: string;
  src: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    key: "BondJames",
    title: "Bond James",
    subtitle: "Classic GT",
    src: "/avatars/BondJames.png",
  },
  {
    key: "ForzaCyber",
    title: "Forza Cyber",
    subtitle: "Cyber Spec",
    src: "/avatars/ForzaCyber.png",
  },
  {
    key: "HuntingSeason",
    title: "Hunting Season",
    subtitle: "Outlaw Rig",
    src: "/avatars/HuntingSeason.png",
  },
  {
    key: "Jump2Future",
    title: "Jump 2 Future",
    subtitle: "Time Machine",
    src: "/avatars/Jump2Future.png",
  },
  {
    key: "MericaMuscle",
    title: "Merica Muscle",
    subtitle: "V8 Flame",
    src: "/avatars/MericaMuscle.png",
  },
  {
    key: "PrinceofCalcutta",
    title: "Prince of Calcutta",
    subtitle: "Heritage Cab",
    src: "/avatars/PrinceofCalcutta.png",
  },
];

const VEHICLE_AVATAR_STORAGE_PREFIX = "atlas_vehicle_avatar_";

export function getSavedVehicleAvatar(
  vehicleId?: string | null,
): VehicleAvatarKey {
  if (!vehicleId || typeof window === "undefined") return "PrinceofCalcutta";
  try {
    const raw = window.localStorage.getItem(
      `${VEHICLE_AVATAR_STORAGE_PREFIX}${vehicleId}`,
    );
    if (raw && AVATAR_PRESETS.some((p) => p.key === raw)) {
      return raw as VehicleAvatarKey;
    }
  } catch {
    // ignore storage errors
  }
  return "PrinceofCalcutta";
}

export function saveVehicleAvatar(
  vehicleId: string,
  avatarKey: VehicleAvatarKey,
) {
  if (!vehicleId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${VEHICLE_AVATAR_STORAGE_PREFIX}${vehicleId}`,
      avatarKey,
    );
    window.dispatchEvent(
      new CustomEvent("atlas:vehicle-avatar-change", {
        detail: { vehicleId, avatarKey },
      }),
    );
  } catch {
    // ignore storage errors
  }
}

interface VehicleAvatarProps {
  avatarKey?: string | null;
  vehicleId?: string | null;
  className?: string;
}

export default function VehicleAvatar({
  avatarKey,
  vehicleId,
  className = "w-full h-full",
}: VehicleAvatarProps) {
  const [resolvedKey, setResolvedKey] = useState<VehicleAvatarKey>(() => {
    if (avatarKey && AVATAR_PRESETS.some((p) => p.key === avatarKey)) {
      return avatarKey as VehicleAvatarKey;
    }
    return getSavedVehicleAvatar(vehicleId);
  });
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (avatarKey && AVATAR_PRESETS.some((p) => p.key === avatarKey)) {
      setResolvedKey(avatarKey as VehicleAvatarKey);
      return;
    }
    setResolvedKey(getSavedVehicleAvatar(vehicleId));
  }, [avatarKey, vehicleId]);

  useEffect(() => {
    const handleAvatarChange = (e: Event) => {
      const detail = (
        e as CustomEvent<{ vehicleId?: string; avatarKey?: VehicleAvatarKey }>
      ).detail;
      if (detail?.vehicleId === vehicleId && detail?.avatarKey) {
        setResolvedKey(detail.avatarKey);
        setFailedSrc(null);
      }
    };
    window.addEventListener("atlas:vehicle-avatar-change", handleAvatarChange);
    return () =>
      window.removeEventListener(
        "atlas:vehicle-avatar-change",
        handleAvatarChange,
      );
  }, [vehicleId]);

  const preset =
    AVATAR_PRESETS.find((item) => item.key === resolvedKey) ||
    AVATAR_PRESETS[5];

  if (failedSrc === preset.src) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, rgba(0,0,0,0.92) 38%, rgba(0,0,0,0.42) 72%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, rgba(0,0,0,0.92) 38%, rgba(0,0,0,0.42) 72%, transparent 100%)",
      }}
      className={`pointer-events-none select-none flex items-end justify-end overflow-hidden ${className}`}
    >
      <img
        src={preset.src}
        alt={preset.title}
        onError={() => setFailedSrc(preset.src)}
        className="h-[124%] sm:h-[130%] w-auto max-w-none object-contain object-right-bottom mix-blend-multiply dark:mix-blend-normal opacity-85 dark:opacity-75 transition-opacity duration-300"
      />
    </div>
  );
}
