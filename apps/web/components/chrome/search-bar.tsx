"use client";

import { useRef } from "react";

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
};

export function SearchBar({ placeholder, value, onChange, onClear }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="search-shell cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-plum/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="search-input min-w-0 flex-1 bg-transparent outline-none placeholder:text-plum/38"
        aria-label={placeholder}
      />

      {value ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
            onClear?.();
            inputRef.current?.focus();
          }}
          className="shrink-0 rounded-full p-0.5 text-plum/40 transition hover:text-plum"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
