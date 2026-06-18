"use client";

import { useCallback, useEffect, useState } from "react";
import { buildPresetRange, type DateFilter } from "@/lib/date-filters";

function readFromStorage(key: string, defaultPreset: string): DateFilter {
  if (typeof window === "undefined") return buildPresetRange(defaultPreset as Parameters<typeof buildPresetRange>[0]);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as DateFilter;
  } catch {}
  return buildPresetRange(defaultPreset as Parameters<typeof buildPresetRange>[0]);
}

export function usePersistedFilter(storageKey: string, defaultPreset = "yesterday") {
  const [filter, setFilterState] = useState<DateFilter | null>(() =>
    buildPresetRange(defaultPreset as Parameters<typeof buildPresetRange>[0]),
  );

  useEffect(() => {
    const stored = readFromStorage(storageKey, defaultPreset);
    setFilterState(stored);
  }, [storageKey, defaultPreset]);

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
