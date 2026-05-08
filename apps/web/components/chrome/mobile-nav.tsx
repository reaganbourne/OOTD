"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type MobileNavActive = "feed" | "boards" | "vault" | "me" | "none";

type MobileNavProps = {
  active: MobileNavActive;
};

function FeedIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-[22px] w-[22px] ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function BoardsIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-[22px] w-[22px] ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </svg>
  );
}

function VaultIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-[22px] w-[22px] ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MeIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-[22px] w-[22px] ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-[3px] text-[9.5px] lowercase tracking-[0.04em] transition ${active ? "text-ink" : "text-mute hover:text-ink-soft"}`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`h-1 w-1 rounded-full bg-pink-deep transition ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </Link>
  );
}

export function MobileNav({ active }: MobileNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-paper lg:hidden"
      style={{ padding: "10px 16px max(28px, env(safe-area-inset-bottom))" }}
    >
      <NavItem href="/feed" label="home" active={active === "feed"} icon={<FeedIcon active={active === "feed"} />} />
      <NavItem href="/boards" label="boards" active={active === "boards"} icon={<BoardsIcon active={active === "boards"} />} />

      {/* Center upload FAB — ink circle */}
      <Link
        href="/upload"
        aria-label="post a fit"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-paper shadow-sm transition hover:opacity-90 active:scale-[0.96]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </Link>

      <NavItem href="/vault" label="vault" active={active === "vault"} icon={<VaultIcon active={active === "vault"} />} />
      <NavItem href="/profile" label="me" active={active === "me"} icon={<MeIcon active={active === "me"} />} />
    </nav>
  );
}
