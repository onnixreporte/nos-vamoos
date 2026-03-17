"use client";

import { useCallback, useState } from "react";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";

function readFromStorage(key: string, defaultPreset: string): DateFilter {
  if (typeof window === "undefined") return buildPresetRange(defaultPreset as Parameters<typeof buildPresetRange>[0]);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as DateFilter;
  } catch {}
  return buildPresetRange(defaultPreset as Parameters<typeof buildPresetRange>[0]);
}

/**
 * Persists the active date filter to localStorage so navigation between pages
 * restores the last filter the user chose for each section.
 *
 * The initial value is read synchronously from localStorage so that both
 * appliedFilter and debouncedFilter can be initialized identically, avoiding
 * a double-fetch on mount.
 */
export function usePersistedFilter(storageKey: string, defaultPreset = "week") {
  const [filter, setFilterState] = useState<DateFilter | null>(() =>
    readFromStorage(storageKey, defaultPreset),
  );

  const setFilter = useCallback(
    (f: DateFilter | null) => {
      setFilterState(f);
      try {
        if (f) localStorage.setItem(storageKey, JSON.stringify(f));
        else localStorage.removeItem(storageKey);
      } catch {}
    },
    [storageKey],
  );

  return [filter, setFilter] as const;
}
