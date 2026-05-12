"use client";

import { useEffect, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];


function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


interface EventDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export function EventDatePicker({ value, onChange }: EventDatePickerProps) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  const todayStr = todayDateString();

  const numDays = daysInMonth(viewYear, viewMonth);
  const offset = firstWeekday(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: numDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(day: number) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(ds);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const formattedDate = value
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" })
        .format(new Date(`${value}T12:00:00`))
    : null;
  const triggerLabel = formattedDate ?? null;

  return (
    <div>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field-shell w-full cursor-pointer justify-between gap-3 text-left"
        style={{ height: "auto", minHeight: 48, paddingTop: 12, paddingBottom: 12 }}
      >
        <span className={`text-sm leading-snug ${triggerLabel ? "text-ink" : "text-mute"}`}>
          {triggerLabel ?? "Select date & time (optional)"}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 flex-shrink-0 text-mute transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Expanded picker */}
      {open && (
        <div className="animate-fade-up mt-2 overflow-hidden rounded-[1.5rem] border border-line bg-white">

          {/* ── Month navigation ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-mute transition hover:bg-pink-soft hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="font-display text-[1.05rem] tracking-[-0.02em] text-ink">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-full text-mute transition hover:bg-pink-soft hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* ── Day headers ── */}
          <div className="grid grid-cols-7 px-2">
            {DAY_INITIALS.map((d, i) => (
              <div
                key={i}
                className="flex h-8 items-center justify-center text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-mute"
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Day cells ── */}
          <div className="grid grid-cols-7 px-2 pb-5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = ds === value;
              const isToday = ds === todayStr;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={[
                    "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                    isSelected
                      ? "bg-pink-deep font-semibold text-white"
                      : isToday
                      ? "font-medium text-ink ring-1 ring-pink-deep/60 hover:bg-pink-soft"
                      : "text-ink hover:bg-pink-soft",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-2 px-5 pb-5">
            {value ? (
              <button
                type="button"
                onClick={() => { onChange(""); }}
                className="flex-1 rounded-[1.2rem] border border-line bg-white py-3 text-sm font-semibold text-mute transition hover:border-pink-deep/25 hover:text-error"
              >
                Clear
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`rounded-[1.2rem] border border-line bg-white py-3 text-sm font-semibold text-ink transition hover:border-pink-deep/25 ${value ? "flex-1" : "w-full"}`}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
