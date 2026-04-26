"use client";

type SearchBarProps = {
  placeholder: string;
  value?: string;
};

export function SearchBar({ placeholder, value }: SearchBarProps) {
  return (
    <div className="search-shell">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 text-plum/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <div className="search-input">
        {value ? <span className="text-ink">{value}</span> : <span>{placeholder}</span>}
      </div>
    </div>
  );
}
