"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { toIsoWithTime, type DateFilter } from "@/lib/date-filters";

interface ComparisonRangePickerProps {
  rangeA: DateFilter;
  rangeB: DateFilter;
  onChange: (rangeA: DateFilter, rangeB: DateFilter) => void;
}

function formatRange(r: DateFilter) {
  try {
    return `${format(new Date(r.from), "dd/MM/yyyy", { locale: es })} – ${format(
      new Date(r.to),
      "dd/MM/yyyy",
      { locale: es },
    )}`;
  } catch {
    return "";
  }
}

function rangeFromDates(range: DateRange): DateFilter {
  const from = range.from!;
  const to = range.to ?? range.from!;
  return {
    from: toIsoWithTime(from, "00:00", false),
    to: toIsoWithTime(to, "23:59", true),
    longTerm: true,
  };
}

interface SidePickerProps {
  letter: "A" | "B";
  color: string;
  range: DateFilter;
  onApply: (r: DateFilter) => void;
}

function SidePicker({ letter, color, range, onApply }: SidePickerProps) {
  const [draft, setDraft] = useState<DateRange | undefined>();

  const apply = useCallback(() => {
    if (!draft?.from) return;
    onApply(rangeFromDates(draft));
    setDraft(undefined);
  }, [draft, onApply]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          {letter}
        </span>
        <span className="text-sm font-medium">Rango {letter}</span>
      </div>
      <p className="text-xs text-muted-foreground">{formatRange(range)}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <CalendarDays className="size-3.5" />
            {draft?.from
              ? draft.to
                ? `${format(draft.from, "dd/MM/yy", { locale: es })} – ${format(draft.to, "dd/MM/yy", { locale: es })}`
                : format(draft.from, "dd/MM/yy", { locale: es })
              : `Cambiar rango ${letter}…`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            locale={es}
            mode="range"
            selected={draft}
            onSelect={setDraft}
            numberOfMonths={2}
          />
          <div className="flex justify-end gap-2 border-t p-2">
            <Button size="sm" onClick={apply} disabled={!draft?.from}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ComparisonRangePicker({
  rangeA,
  rangeB,
  onChange,
}: ComparisonRangePickerProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2">
        <SidePicker
          letter="A"
          color="var(--chart-1)"
          range={rangeA}
          onApply={(r) => onChange(r, rangeB)}
        />
        <SidePicker
          letter="B"
          color="var(--chart-2)"
          range={rangeB}
          onApply={(r) => onChange(rangeA, r)}
        />
      </CardContent>
    </Card>
  );
}
