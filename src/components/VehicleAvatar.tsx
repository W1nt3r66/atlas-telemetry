"use client";

import React from "react";

export type VehicleAvatarCategory = "4-Wheeler" | "2-Wheeler";

export type CarAvatarKey =
  | "PrinceofCalcutta"
  | "BondJames"
  | "ForzaCyber"
  | "HuntingSeason"
  | "Jump2Future"
  | "MericaMuscle";

export type BikeAvatarKey = "HotCruze" | "Vespucci" | "Adventura" | "CyberZaap";

export type VehicleAvatarKey = CarAvatarKey | BikeAvatarKey;

export interface AvatarPreset {
  key: VehicleAvatarKey;
  title: string;
  subtitle: string;
  src: string;
  category: VehicleAvatarCategory;
}

export const CAR_AVATAR_PRESETS: AvatarPreset[] = [
  {
    key: "PrinceofCalcutta",
    title: "Prince of Calcutta",
    subtitle: "Checker Cab Heritage",
    src: "/avatars/PrinceofCalcutta.png",
    category: "4-Wheeler",
  },
  {
    key: "BondJames",
    title: "Bond James",
    subtitle: "Classic Silver GT",
    src: "/avatars/BondJames.png",
    category: "4-Wheeler",
  },
  {
    key: "ForzaCyber",
    title: "Forza Cyber",
    subtitle: "Midnight Aero Coupe",
    src: "/avatars/ForzaCyber.png",
    category: "4-Wheeler",
  },
  {
    key: "HuntingSeason",
    title: "Hunting Season",
    subtitle: "Matte Interceptor",
    src: "/avatars/HuntingSeason.png",
    category: "4-Wheeler",
  },
  {
    key: "Jump2Future",
    title: "Jump 2 Future",
    subtitle: "Time-Travel Gullwing",
    src: "/avatars/Jump2Future.png",
    category: "4-Wheeler",
  },
  {
    key: "MericaMuscle",
    title: "Merica Muscle",
    subtitle: "Flame V8 Street",
    src: "/avatars/MericaMuscle.png",
    category: "4-Wheeler",
  },
];

export const BIKE_AVATAR_PRESETS: AvatarPreset[] = [
  {
    key: "HotCruze",
    title: "Hot Cruze",
    subtitle: "Flame Custom Cruiser",
    src: "/avatars/HotCruze.png",
    category: "2-Wheeler",
  },
  {
    key: "Vespucci",
    title: "Vespucci",
    subtitle: "Classic Cab Scooter",
    src: "/avatars/Vespucci.png",
    category: "2-Wheeler",
  },
  {
    key: "Adventura",
    title: "Adventura",
    subtitle: "Wasteland Trail ADV",
    src: "/avatars/Adventura.png",
    category: "2-Wheeler",
  },
  {
    key: "CyberZaap",
    title: "Cyber Zaap",
    subtitle: "Silver Sci-Fi Sport",
    src: "/avatars/CyberZaap.png",
    category: "2-Wheeler",
  },
];

export const AVATAR_PRESETS: AvatarPreset[] = [
  ...CAR_AVATAR_PRESETS,
  ...BIKE_AVATAR_PRESETS,
];

const AVATAR_STORAGE_PREFIX = "atlas_vehicle_avatar_v1_";

export function getSavedVehicleAvatar(vehicleId: string): VehicleAvatarKey {
  if (typeof window === "undefined") return "PrinceofCalcutta";
  const raw = localStorage.getItem(`${AVATAR_STORAGE_PREFIX}${vehicleId}`);
  if (raw && AVATAR_PRESETS.some((p) => p.key === raw)) {
    return raw as VehicleAvatarKey;
  }
  return "PrinceofCalcutta";
}

export function saveVehicleAvatar(vehicleId: string, key: VehicleAvatarKey) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${AVATAR_STORAGE_PREFIX}${vehicleId}`, key);
  window.dispatchEvent(new Event("atlas:vehicle-avatar-change"));
}

interface VehicleAvatarProps {
  avatarKey?: VehicleAvatarKey | string | null;
  vehicleId?: string;
  className?: string;
}

export default function VehicleAvatar({
  avatarKey,
  vehicleId,
  className = "w-14 h-14 object-contain",
}: VehicleAvatarProps) {
  const resolvedKey: VehicleAvatarKey = (() => {
    if (avatarKey && AVATAR_PRESETS.some((p) => p.key === avatarKey)) {
      return avatarKey as VehicleAvatarKey;
    }
    if (vehicleId) {
      return getSavedVehicleAvatar(vehicleId);
    }
    return "PrinceofCalcutta";
  })();

  const preset =
    AVATAR_PRESETS.find((p) => p.key === resolvedKey) || AVATAR_PRESETS[0];

  return (
    <img
      src={preset.src}
      alt={preset.title}
      className={className}
      loading="lazy"
    />
  );
}
