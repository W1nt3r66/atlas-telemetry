"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type PowertrainType =
  | "Petrol"
  | "Diesel"
  | "CNG"
  | "Hybrid"
  | "Electric";
export type WheelerType = "2-Wheeler" | "3-Wheeler" | "4-Wheeler";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  manufacturer: string;
  year: number;
  fuel_type: PowertrainType;
  wheeler_type: WheelerType;
  tank_capacity?: number;
  initial_odo: number;
  service_interval_km: number;
  service_interval_days: number;
  last_service_odo: number;
  last_service_date: string;
  last_wash_date: string;
}

export interface LogEntry {
  id: string;
  vehicle_id: string;
  type: "fuel" | "expense" | "service" | "wash";
  date: string;
  amount: number;
  fuel_liters?: number | null;
  odo_reading?: number | null;
  category: string;
  notes: string;
  calculated_mileage?: number | null;
}

export interface OwnerProfile {
  syncId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
}

const EMPTY_OWNER: OwnerProfile = {
  syncId: "",
  fullName: "",
  email: "",
  phone: "",
  city: "",
};

function cleanVehicleManufacturer(
  rawMakeModel: string,
  nickname: string,
): string {
  const tokens = rawMakeModel.trim().split(/\s+/).filter(Boolean);
  const deduped: string[] = [];
  for (const tok of tokens) {
    if (
      deduped.length === 0 ||
      deduped[deduped.length - 1].toLowerCase() !== tok.toLowerCase()
    ) {
      deduped.push(tok);
    }
  }
  if (
    nickname &&
    deduped.length > 1 &&
    deduped[deduped.length - 1].toLowerCase() === nickname.trim().toLowerCase()
  ) {
    deduped.pop();
  }
  return deduped.join(" ");
}

function extractNonFuelItemLabel(e: any, fallbackCategory: string): string {
  const validParts: string[] = [];
  const seen = new Set<string>();

  const vendor = [e.workshop, e.vendor, e.store, e.platform, e.station]
    .find((v) => typeof v === "string" && v.trim().length > 0)
    ?.trim();

  if (vendor) {
    seen.add(vendor.toLowerCase());
    validParts.push(vendor);
  }

  const candidates = [
    e.name,
    e.itemName,
    e.item_name,
    e.item,
    e.product,
    e.productName,
    e.title,
    e.label,
    e.notes,
    e.note,
    e.description,
    e.remarks,
    e.detail,
  ];

  for (const rawVal of candidates) {
    if (!rawVal || typeof rawVal !== "string") continue;
    const trimmed = rawVal.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || lower === "full tank" || lower === "fuel fill") continue;
    if (!seen.has(lower)) {
      seen.add(lower);
      validParts.push(trimmed);
    }
  }

  return validParts.length > 0 ? validParts.join(" • ") : fallbackCategory;
}

function parseMotorlyGarageData(raw: any, fallbackEmail?: string) {
  const today = new Date().toISOString().split("T")[0];

  const rawVehicles =
    Array.isArray(raw?.vehicles) && raw.vehicles.length > 0
      ? raw.vehicles
      : raw?.car && Object.keys(raw.car).length > 0
        ? [raw.car]
        : [];

  const mappedVehicles: Vehicle[] = rawVehicles.map((v: any, idx: number) => {
    const rawFuel = String(v.fuelType || v.fuel_type || "Petrol").toLowerCase();
    let fuel_type: PowertrainType = "Petrol";
    if (rawFuel.includes("diesel")) fuel_type = "Diesel";
    else if (rawFuel.includes("cng")) fuel_type = "CNG";
    else if (rawFuel.includes("hybrid")) fuel_type = "Hybrid";
    else if (rawFuel.includes("ev") || rawFuel.includes("electric"))
      fuel_type = "Electric";

    const rawType = String(v.wheeler_type || v.type || "car").toLowerCase();
    let wheeler_type: WheelerType = "4-Wheeler";
    if (
      rawType.includes("2") ||
      rawType.includes("bike") ||
      rawType.includes("scooter")
    ) {
      wheeler_type = "2-Wheeler";
    } else if (rawType.includes("3") || rawType.includes("auto")) {
      wheeler_type = "3-Wheeler";
    }

    const fullMakeModel = [v.make, v.model].filter(Boolean).join(" ").trim();
    const displayName =
      v.nickname || v.name || v.model || fullMakeModel || `Vehicle ${idx + 1}`;
    const cleanedManufacturer = cleanVehicleManufacturer(
      v.manufacturer || fullMakeModel || "",
      displayName,
    );

    return {
      id: v.id || `motorly-v-${idx}`,
      name: displayName,
      plate: String(v.registration || v.plate || "").toUpperCase(),
      manufacturer: cleanedManufacturer,
      year: Number(v.year) || new Date().getFullYear(),
      fuel_type,
      wheeler_type,
      tank_capacity: Number(v.tank ?? v.tank_capacity ?? 0) || undefined,
      initial_odo: Number(v.initial_odo ?? v.odometer ?? 0),
      service_interval_km: Number(
        v.serviceInterval ?? v.service_interval_km ?? 10000,
      ),
      service_interval_days: Number(v.service_interval_days ?? 365),
      last_service_odo: Number(v.last_service_odo ?? v.initial_odo ?? 0),
      last_service_date: v.last_service_date || today,
      last_wash_date: v.last_wash_date || today,
    };
  });

  const defaultVehicleId =
    raw?.activeVehicleId &&
    mappedVehicles.some((v) => v.id === raw.activeVehicleId)
      ? raw.activeVehicleId
      : mappedVehicles[0]?.id || "";

  const rawFuelArray = Array.isArray(raw?.fuel) ? [...raw.fuel] : [];
  const actualFuelItems: any[] = [];
  const misplacedExpenseItems: any[] = [];

  rawFuelArray.forEach((item: any) => {
    const liters = Number(item.liters ?? item.fuel_liters ?? 0);
    const catLower = String(item.category || "").toLowerCase();
    const isNonFuelCategory =
      catLower.includes("accessor") ||
      catLower.includes("wash") ||
      catLower.includes("insur") ||
      catLower.includes("toll") ||
      catLower.includes("park") ||
      catLower.includes("repair") ||
      catLower.includes("tyre") ||
      catLower.includes("tire") ||
      catLower.includes("expense");

    if (liters > 0 && !isNonFuelCategory) {
      actualFuelItems.push(item);
    } else {
      misplacedExpenseItems.push(item);
    }
  });

  actualFuelItems.sort((a: any, b: any) => {
    const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCmp !== 0) return dateCmp;
    return Number(a.odometer || 0) - Number(b.odometer || 0);
  });

  const lastOdoByVehicle: Record<string, number> = {};
  mappedVehicles.forEach((v) => {
    if (v.initial_odo > 0) lastOdoByVehicle[v.id] = v.initial_odo;
  });

  const mappedFuelLogs: LogEntry[] = actualFuelItems.map(
    (f: any, idx: number) => {
      const vId = f.vehicleId || f.vehicle_id || defaultVehicleId;
      const odo = Number(f.odometer ?? f.odo_reading ?? 0) || null;
      const liters = Number(f.liters ?? f.fuel_liters ?? 0) || null;
      const amount = Number(f.amount ?? 0);

      let mileage = Number(f.calculated_mileage ?? 0) || null;
      if (
        !mileage &&
        odo &&
        liters &&
        lastOdoByVehicle[vId] &&
        odo > lastOdoByVehicle[vId]
      ) {
        mileage = Number(((odo - lastOdoByVehicle[vId]) / liters).toFixed(2));
      }
      if (odo && (!lastOdoByVehicle[vId] || odo > lastOdoByVehicle[vId])) {
        lastOdoByVehicle[vId] = odo;
      }

      const noteParts = [f.station, f.notes || f.note || f.description].filter(
        Boolean,
      );

      return {
        id: f.id || `motorly-f-${idx}`,
        vehicle_id: vId,
        type: "fuel",
        date: f.date || today,
        amount,
        fuel_liters: liters,
        odo_reading: odo,
        category: "Fuel",
        notes: noteParts.join(" • ") || "Fuel Fill",
        calculated_mileage: mileage,
      };
    },
  );

  const rawExpenseList = [
    ...(Array.isArray(raw?.expenses) ? raw.expenses : []),
    ...misplacedExpenseItems,
  ];

  const mappedExpenseLogs: LogEntry[] = rawExpenseList.map(
    (e: any, idx: number) => {
      const cat = String(e.category || e.type || "Accessories");
      const lower = cat.toLowerCase();
      let type: LogEntry["type"] = "expense";
      if (lower.includes("service") || lower.includes("maint"))
        type = "service";
      else if (lower.includes("wash") || lower.includes("clean")) type = "wash";

      const resolvedNotes = extractNonFuelItemLabel(e, cat);

      return {
        id: e.id || `motorly-e-${idx}`,
        vehicle_id: e.vehicleId || e.vehicle_id || defaultVehicleId,
        type,
        date: e.date || today,
        amount: Number(e.amount ?? 0),
        odo_reading: Number(e.odometer ?? e.odo_reading ?? 0) || null,
        category: cat,
        notes: resolvedNotes,
      };
    },
  );

  const allLogs = [...mappedFuelLogs, ...mappedExpenseLogs].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  const rawOwner = raw?.owner || {};
  const mappedOwner: OwnerProfile = {
    syncId: rawOwner.syncId || "ATL-MOTORLY",
    fullName: rawOwner.name || rawOwner.fullName || "",
    email: rawOwner.email || fallbackEmail || "",
    phone: rawOwner.phone || "",
    city: rawOwner.city || "",
  };

  return { mappedVehicles, allLogs, mappedOwner, activeId: defaultVehicleId };
}

interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: User | null;
  authLoading: boolean;
  initialDataLoaded: boolean;
  syncStatus: "signed_out" | "syncing" | "synced" | "error";
  lastError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  setActiveVehicleId: (id: string) => void;
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, "id">) => Promise<void>;
  addVehicle: (v: Omit<Vehicle, "id">) => Promise<void>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  clearAllData: () => void;
  owner: OwnerProfile;
  updateOwner: (updates: Partial<OwnerProfile>) => void;
  deleteAccount: () => Promise<void>;
  isDemoMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<
    "signed_out" | "syncing" | "synced" | "error"
  >("signed_out");
  const [lastError, setLastError] = useState<string | null>(null);
  const [rawGarageBlob, setRawGarageBlob] = useState<any>({});

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [owner, setOwner] = useState<OwnerProfile>(EMPTY_OWNER);
  const isDemoMode = !isSupabaseConfigured || !user;

  useEffect(() => {
    if (!authLoading && !user && pathname !== "/") {
      router.replace("/");
    }
  }, [authLoading, user, pathname, router]);

  const pushToSupabase = useCallback(
    async (
      currentUser: User | null,
      nextVehicles: Vehicle[],
      nextLogs: LogEntry[],
      nextOwner: OwnerProfile,
      existingBlob: any,
    ) => {
      if (!supabase || !currentUser) return;
      setSyncStatus("syncing");
      setLastError(null);

      const motorlyVehicles = nextVehicles.map((v) => {
        const cleanMake = cleanVehicleManufacturer(v.manufacturer, v.name);
        return {
          id: v.id,
          nickname: v.name,
          manufacturer: cleanMake,
          make: cleanMake,
          model: "",
          year: String(v.year),
          registration: v.plate,
          fuelType: v.fuel_type,
          tank: v.tank_capacity ? String(v.tank_capacity) : "",
          type: v.wheeler_type === "2-Wheeler" ? "bike" : "car",
          serviceInterval: String(v.service_interval_km),
          initial_odo: v.initial_odo,
          last_service_odo: v.last_service_odo,
          last_service_date: v.last_service_date,
          last_wash_date: v.last_wash_date,
        };
      });

      const fuelLogs = nextLogs
        .filter((l) => l.type === "fuel")
        .map((l) => ({
          id: l.id,
          vehicleId: l.vehicle_id,
          date: l.date,
          amount: l.amount,
          liters: l.fuel_liters ?? 0,
          odometer: l.odo_reading ?? 0,
          note: l.notes,
          category: "Fuel",
          calculated_mileage: l.calculated_mileage ?? null,
        }));

      const expenseLogs = nextLogs
        .filter((l) => l.type !== "fuel")
        .map((l) => ({
          id: l.id,
          vehicleId: l.vehicle_id,
          date: l.date,
          amount: l.amount,
          category: l.category,
          odometer: l.odo_reading ?? null,
          name: l.notes,
          title: l.notes,
          note: l.notes,
        }));

      const updatedPayload = {
        ...existingBlob,
        car: motorlyVehicles[0] || {},
        vehicles: motorlyVehicles,
        fuel: fuelLogs,
        expenses: expenseLogs,
        activeVehicleId: nextVehicles[0]?.id || "vehicle-primary",
        owner: {
          ...(existingBlob?.owner || {}),
          name: nextOwner.fullName,
          email: nextOwner.email,
          phone: nextOwner.phone,
          city: nextOwner.city,
          syncId: nextOwner.syncId,
        },
        updatedAt: new Date().toISOString(),
      };

      setRawGarageBlob(updatedPayload);

      const { error } = await supabase.from("user_garages").upsert(
        {
          user_id: currentUser.id,
          garage_data: updatedPayload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        setLastError(error.message);
        setSyncStatus("error");
      } else {
        setSyncStatus("synced");
      }
    },
    [],
  );

  const loadFromSupabase = useCallback(async (authUser: User) => {
    if (!supabase) return;
    setSyncStatus("syncing");
    setLastError(null);

    const { data, error } = await supabase
      .from("user_garages")
      .select("garage_data")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (error) {
      setLastError(error.message);
      setSyncStatus("error");
      setInitialDataLoaded(true);
      return;
    }

    if (data?.garage_data) {
      setRawGarageBlob(data.garage_data);
      const { mappedVehicles, allLogs, mappedOwner, activeId } =
        parseMotorlyGarageData(data.garage_data, authUser.email);

      setVehicles(mappedVehicles);
      setActiveVehicleId(activeId);
      localStorage.setItem("atlas_vehicles", JSON.stringify(mappedVehicles));

      setLogs(allLogs);
      localStorage.setItem("atlas_logs", JSON.stringify(allLogs));

      const mergedOwner: OwnerProfile = {
        ...mappedOwner,
        syncId: "ATL-" + authUser.id.slice(0, 6).toUpperCase(),
        email: mappedOwner.email || authUser.email || "",
        fullName:
          mappedOwner.fullName || authUser.user_metadata?.full_name || "",
      };
      setOwner(mergedOwner);
      localStorage.setItem("atlas_owner", JSON.stringify(mergedOwner));
    } else {
      const newOwner: OwnerProfile = {
        syncId: "ATL-" + authUser.id.slice(0, 6).toUpperCase(),
        fullName: authUser.user_metadata?.full_name || "",
        email: authUser.email || "",
        phone: "",
        city: "",
      };
      setVehicles([]);
      setLogs([]);
      setActiveVehicleId("");
      setOwner(newOwner);
      localStorage.setItem("atlas_vehicles", JSON.stringify([]));
      localStorage.setItem("atlas_logs", JSON.stringify([]));
      localStorage.setItem("atlas_owner", JSON.stringify(newOwner));
    }
    setSyncStatus("synced");
    setInitialDataLoaded(true);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("atlas_theme") as
      | "light"
      | "dark"
      | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Hydrate cached vehicles/logs immediately so there is zero empty flash
    try {
      const cachedVehicles = JSON.parse(
        localStorage.getItem("atlas_vehicles") || "[]",
      );
      const cachedLogs = JSON.parse(localStorage.getItem("atlas_logs") || "[]");
      const cachedOwner = JSON.parse(
        localStorage.getItem("atlas_owner") || "null",
      );
      if (Array.isArray(cachedVehicles) && cachedVehicles.length > 0) {
        setVehicles(cachedVehicles);
        setActiveVehicleId(cachedVehicles[0].id);
      }
      if (Array.isArray(cachedLogs) && cachedLogs.length > 0) {
        setLogs(cachedLogs);
      }
      if (cachedOwner) {
        setOwner(cachedOwner);
      }
    } catch {
      // Ignore malformed cache
    }

    if (!supabase) {
      setAuthLoading(false);
      setInitialDataLoaded(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadFromSupabase(currentUser);
      } else {
        setSyncStatus("signed_out");
        setInitialDataLoaded(true);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadFromSupabase(currentUser);
      } else {
        setVehicles([]);
        setLogs([]);
        setActiveVehicleId("");
        setOwner(EMPTY_OWNER);
        setSyncStatus("signed_out");
        setInitialDataLoaded(true);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadFromSupabase]);

  const signInWithGoogle = async () => {
    if (!supabase) {
      const msg =
        "Supabase keys missing in .env.local. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and restart npm run dev.";
      setLastError(msg);
      alert(msg);
      return;
    }
    setSyncStatus("syncing");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setSyncStatus("error");
      setLastError(error.message);
      alert(`Sign-in error: ${error.message}`);
    } else if (data?.url) {
      window.location.href = data.url;
    }
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      localStorage.removeItem("atlas_vehicles");
      localStorage.removeItem("atlas_logs");
      localStorage.removeItem("atlas_owner");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) localStorage.removeItem(key);
      });

      setUser(null);
      setVehicles([]);
      setLogs([]);
      setActiveVehicleId("");
      setOwner(EMPTY_OWNER);
      setRawGarageBlob({});
      setLastError(null);
      setSyncStatus("signed_out");
      router.replace("/");
    }
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("atlas_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const addLog = async (entry: Omit<LogEntry, "id">) => {
    let calculated_mileage = entry.calculated_mileage ?? null;
    const vehicle = vehicles.find((v) => v.id === entry.vehicle_id);

    if (entry.type === "fuel" && entry.odo_reading && entry.fuel_liters) {
      const prevFuelOdos = logs
        .filter(
          (l) =>
            l.vehicle_id === entry.vehicle_id &&
            l.type === "fuel" &&
            l.odo_reading,
        )
        .map((l) => Number(l.odo_reading));

      const baselineOdo =
        prevFuelOdos.length > 0
          ? Math.max(...prevFuelOdos)
          : vehicle?.initial_odo || 0;

      if (baselineOdo > 0 && entry.odo_reading > baselineOdo) {
        const dist = entry.odo_reading - baselineOdo;
        calculated_mileage = Number((dist / entry.fuel_liters).toFixed(2));
      }
    }

    const newLog: LogEntry = {
      ...entry,
      id: "log-" + Date.now(),
      calculated_mileage,
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem("atlas_logs", JSON.stringify(updatedLogs));

    let updatedVehicles = vehicles;
    if (entry.type === "wash" || entry.type === "service") {
      updatedVehicles = vehicles.map((v) => {
        if (v.id !== entry.vehicle_id) return v;
        return {
          ...v,
          ...(entry.type === "wash" ? { last_wash_date: entry.date } : {}),
          ...(entry.type === "service"
            ? {
                last_service_date: entry.date,
                ...(entry.odo_reading
                  ? { last_service_odo: entry.odo_reading }
                  : {}),
              }
            : {}),
        };
      });
      setVehicles(updatedVehicles);
      localStorage.setItem("atlas_vehicles", JSON.stringify(updatedVehicles));
    }

    await pushToSupabase(
      user,
      updatedVehicles,
      updatedLogs,
      owner,
      rawGarageBlob,
    );
  };

  const addVehicle = async (v: Omit<Vehicle, "id">) => {
    const newVehicle: Vehicle = { ...v, id: "veh-" + Date.now() };
    const updated = [...vehicles, newVehicle];
    setVehicles(updated);
    setActiveVehicleId(newVehicle.id);
    localStorage.setItem("atlas_vehicles", JSON.stringify(updated));
    await pushToSupabase(user, updated, logs, owner, rawGarageBlob);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    const updated = vehicles.map((v) =>
      v.id === id ? { ...v, ...updates } : v,
    );
    setVehicles(updated);
    localStorage.setItem("atlas_vehicles", JSON.stringify(updated));
    pushToSupabase(user, updated, logs, owner, rawGarageBlob);
  };

  const deleteVehicle = (id: string) => {
    const updatedVehicles = vehicles.filter((v) => v.id !== id);
    const updatedLogs = logs.filter((l) => l.vehicle_id !== id);
    setVehicles(updatedVehicles);
    setLogs(updatedLogs);
    localStorage.setItem("atlas_vehicles", JSON.stringify(updatedVehicles));
    localStorage.setItem("atlas_logs", JSON.stringify(updatedLogs));
    if (activeVehicleId === id) {
      setActiveVehicleId(updatedVehicles[0]?.id || "");
    }
    pushToSupabase(user, updatedVehicles, updatedLogs, owner, rawGarageBlob);
  };

  const clearAllData = () => {
    setVehicles([]);
    setLogs([]);
    setActiveVehicleId("");
    localStorage.setItem("atlas_vehicles", JSON.stringify([]));
    localStorage.setItem("atlas_logs", JSON.stringify([]));
    pushToSupabase(user, [], [], owner, rawGarageBlob);
  };

  const updateOwner = (updates: Partial<OwnerProfile>) => {
    const next = { ...owner, ...updates };
    setOwner(next);
    localStorage.setItem("atlas_owner", JSON.stringify(next));
    pushToSupabase(user, vehicles, logs, next, rawGarageBlob);
  };

  const deleteAccount = async () => {
    await pushToSupabase(user, [], [], EMPTY_OWNER, {});
    await signOut();
  };

  const activeVehicle =
    vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || null;

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        authLoading,
        initialDataLoaded,
        syncStatus,
        lastError,
        signInWithGoogle,
        signOut,
        vehicles,
        activeVehicle,
        setActiveVehicleId,
        logs,
        addLog,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        clearAllData,
        owner,
        updateOwner,
        deleteAccount,
        isDemoMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
