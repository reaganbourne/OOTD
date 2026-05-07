"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type MobileNavProps = {
  active: "home" | "boards" | "vault" | "profile" | "none";
};

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-[#f46a93]" : "text-plum/60"}`}
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

function BoardsIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-[#f46a93]" : "text-plum/60"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-[#f46a93]" : "text-plum/60"}`}
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

function VaultIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${active ? "text-[#f46a93]" : "text-plum/60"}`}
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
      className="flex min-w-[56px] flex-col items-center gap-1 rounded-full px-3 py-2 text-[0.72rem] font-medium text-plum/72 transition hover:text-plum"
    >
      {icon}
      <span className={active ? "text-[#f46a93]" : ""}>{label}</span>
      <span
        className={`h-1.5 w-1.5 rounded-full bg-[#f46a93] transition ${
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
        <NavItem href="/feed" label="Home" active={active === "home"} icon={<HomeIcon active={active === "home"} />} />
        <NavItem href="/boards" label="Boards" active={active === "boards"} icon={<BoardsIcon active={active === "boards"} />} />

        {/* Center upload FAB — pops above the dock */}
        <Link
          href="/upload"
          aria-label="Upload outfit"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ef6c96] to-[#f493b0] shadow-[0_8px_28px_rgba(244,106,147,0.45)] transition hover:brightness-[0.97] active:scale-[0.96]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 text-white"
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

        <NavItem href="/vault" label="Vault" active={active === "vault"} icon={<VaultIcon active={active === "vault"} />} />
        <NavItem href="/profile" label="Profile" active={active === "profile"} icon={<ProfileIcon active={active === "profile"} />} />
      </div>
    </nav>
  );
}
