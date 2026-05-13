"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildPresetRange,
  type DateFilter,
  type FilterPreset,
  PRESETS,
  toIsoWithTime,
} from "@/lib/date-filters";
import type {
  AdditionalFilterOptions,
  AdditionalFilters,
} from "@/lib/dashboard-filters";

export interface DateFilterBarProps {
  appliedFilter: DateFilter | null;
  onFilterChange: (filter: DateFilter | null) => void;
  defaultPreset?: FilterPreset | null;
  additionalFilters?: AdditionalFilters;
  onAdditionalFiltersChange?: (filters: AdditionalFilters) => void;
  additionalFilterOptions?: AdditionalFilterOptions;
}

function detectPreset(filter: DateFilter | null): FilterPreset | null {
  if (!filter?.from || !filter?.to) return null;
  for (const { key } of PRESETS) {
    if (key === "custom") continue;
    const range = buildPresetRange(key as Exclude<FilterPreset, "custom">);
    if (range.from === filter.from && range.to === filter.to) {
      return key;
    }
  }
  return "custom";
}

export function DateFilterBar({
  appliedFilter,
  onFilterChange,
  defaultPreset = null,
  additionalFilters,
  onAdditionalFiltersChange,
  additionalFilterOptions,
}: DateFilterBarProps) {
  const [activePreset, setActivePreset] = useState<FilterPreset | null>(
    () => detectPreset(appliedFilter) ?? defaultPreset,
  );

  useEffect(() => {
    const detected = detectPreset(appliedFilter);
    setActivePreset(detected);
  }, [appliedFilter?.from, appliedFilter?.to]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");

  const handlePreset = useCallback(
    (preset: FilterPreset) => {
      if (preset === activePreset) {
        setActivePreset(null);
        onFilterChange(null);
        setDateRange(undefined);
        return;
      }
      setActivePreset(preset);
      if (preset !== "custom") {
        const range = buildPresetRange(preset);
        onFilterChange(range);
        setDateRange(undefined);
        setFromTime("00:00");
        setToTime("23:59");
      }
    },
    [activePreset, onFilterChange]
  );

  const applyCustomFilter = useCallback(() => {
    if (!dateRange?.from) return;
    const fromDate = dateRange.from;
    const toDate = dateRange.to ?? dateRange.from;
    const from = toIsoWithTime(fromDate, fromTime, false);
    const to = toIsoWithTime(toDate, toTime, true);
    onFilterChange({ from, to, longTerm: true });
  }, [dateRange, fromTime, toTime, onFilterChange]);

  const clearAll = useCallback(() => {
    setActivePreset(null);
    setDateRange(undefined);
    setFromTime("00:00");
    setToTime("23:59");
    onFilterChange(null);
    onAdditionalFiltersChange?.({
      agent: "all",
      typification: "all",
      tag: "all",
    });
  }, [onFilterChange, onAdditionalFiltersChange]);

  const isCustomOpen = activePreset === "custom";

  const filterSummary =
    activePreset === "custom" && appliedFilter
      ? `${format(new Date(appliedFilter.from), "dd/MM/yyyy HH:mm", { locale: es })} – ${format(new Date(appliedFilter.to), "dd/MM/yyyy HH:mm", { locale: es })}`
      : null;

  const selectedAdditionalFilters = additionalFilters ?? {
    agent: "all",
    typification: "all",
    tag: "all",
  };

  return (
    <div className="space-y-3" suppressHydrationWarning>
      <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
        {PRESETS.map(({ key, label }) => (
          <Button
            key={key}
            variant={activePreset === key ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(key)}
            aria-pressed={activePreset === key}
          >
            {key === "custom" && <CalendarDays className="size-3.5" />}
            {label}
          </Button>
        ))}

        {activePreset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            aria-label="Limpiar filtros"
            className="text-muted-foreground"
          >
            <X className="size-3.5" />
            Limpiar
          </Button>
        )}

        {filterSummary && (
          <span className="text-xs text-muted-foreground">
            {filterSummary}
          </span>
        )}
      </div>

      {additionalFilterOptions && onAdditionalFiltersChange && (
        <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
          <Select
            value={selectedAdditionalFilters.agent}
            onValueChange={(value) =>
              onAdditionalFiltersChange({
                ...selectedAdditionalFilters,
                agent: value,
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Todos los agentes</SelectItem>
              {additionalFilterOptions.agents.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAdditionalFilters.typification}
            onValueChange={(value) =>
              onAdditionalFiltersChange({
                ...selectedAdditionalFilters,
                typification: value,
              })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipificación" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Todas las tipificaciones</SelectItem>
              {additionalFilterOptions.typifications.map((typification) => (
                <SelectItem key={typification} value={typification}>
                  {typification}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAdditionalFilters.tag}
            onValueChange={(value) =>
              onAdditionalFiltersChange({
                ...selectedAdditionalFilters,
                tag: value,
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Etiqueta" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Todas las etiquetas</SelectItem>
              {additionalFilterOptions.tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isCustomOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
          <div className="space-y-1 space-x-1">
            <label
              htmlFor="date-range-trigger"
              className="text-xs font-medium text-muted-foreground"
            >
              Rango de fechas 
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range-trigger"
                  variant="outline"
                  className="w-56 justify-start text-left text-xs font-normal"
                >
                  <CalendarDays className="size-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy", { locale: es })} –{" "}
                        {format(dateRange.to, "dd/MM/yy", { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yy", { locale: es })
                    )
                  ) : (
                    "Selecciona fechas…"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  locale={es}
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1 space-x-1">
            <label
              htmlFor="time-from"
              className="text-xs font-medium text-muted-foreground"
            >
              Desde 
            </label>
            <Input
              type="time"
              id="time-from"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="w-28 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>

          <div className="space-y-1 space-x-1">
            <label
              htmlFor="time-to"
              className="text-xs font-medium text-muted-foreground"
            >
              Hasta 
            </label>
            <Input
              type="time"
              id="time-to"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="w-28 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>

          <Button
            onClick={applyCustomFilter}
            disabled={!dateRange?.from}
          >
            Aplicar rango 
          </Button>
        </div>
      )}
    </div>
  );
}
