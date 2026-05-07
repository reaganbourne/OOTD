"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type MobileNavActive = "feed" | "discover" | "vault" | "me" | "none";

type MobileNavProps = {
  active: MobileNavActive;
};

function FeedIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 10v8.5h11V10" />
    </svg>
  );
}

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-5 2-2 5 5-2 2-5Z" />
    </svg>
  );
}

function VaultIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7.5A2.5 2.5 0 0 1 9.5 5h5A2.5 2.5 0 0 1 17 7.5V9H7V7.5Z" />
      <path d="M6 9h12v9.5A2.5 2.5 0 0 1 15.5 21h-7A2.5 2.5 0 0 1 6 18.5V9Z" />
      <path d="M10 13h4" />
    </svg>
  );
}

function MeIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-ink" : "text-mute"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
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
      className={`flex min-w-[56px] flex-col items-center gap-1 px-3 py-2 text-[0.7rem] font-medium lowercase transition ${active ? "text-ink" : "text-mute hover:text-ink-soft"}`}
    >
      {icon}
      <span>{label}</span>
      {/* 4px pink-deep active dot per checkd spec */}
      <span
        className={`h-[3px] w-[3px] rounded-full bg-pink-deep transition ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </Link>
  );
}

export function MobileNav({ active }: MobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="mobile-dock">
        <NavItem href="/feed" label="feed" active={active === "feed"} icon={<FeedIcon active={active === "feed"} />} />
        <NavItem href="/explore" label="discover" active={active === "discover"} icon={<DiscoverIcon active={active === "discover"} />} />

        {/* Center upload FAB — ink circle */}
        <Link
          href="/upload"
          aria-label="post a fit"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ink shadow-lift transition hover:opacity-90 active:scale-[0.96]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 text-paper"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </Link>

        <NavItem href="/vault" label="vault" active={active === "vault"} icon={<VaultIcon active={active === "vault"} />} />
        <NavItem href="/profile" label="me" active={active === "me"} icon={<MeIcon active={active === "me"} />} />
      </div>
    </nav>
  );
}
