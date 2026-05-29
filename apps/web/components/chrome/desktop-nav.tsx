"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const AUTH_PATHS = ["/login", "/signup", "/onboarding", "/forgot-password", "/upload"];

const NAV_LINKS = [
  { href: "/feed", label: "feed" },
  { href: "/explore", label: "discover" },
  { href: "/vault", label: "my vault" },
  { href: "/boards", label: "boards" },
];

export function DesktopNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/") return null;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-14 items-center border-b border-pink/30 bg-pink px-5 lg:h-16 lg:px-8">
      {/* Left: wordmark + links (links hidden on mobile) */}
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="font-display italic leading-none text-white"
          style={{ fontSize: "1.75rem", letterSpacing: "-0.01em" }}
        >
          checkd
        </Link>
        <div className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm transition hover:text-white ${
                pathname.startsWith(href) ? "font-medium text-white" : "text-white/70"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: search + post CTA + avatar (search + post hidden on mobile) */}
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/search"
          className="hidden h-9 items-center gap-2 rounded-full bg-white px-4 text-sm text-mute transition hover:text-ink-soft lg:flex"
          style={{ width: 260 }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span>search</span>
        </Link>

        <Link
          href="/upload"
          className="hidden h-9 items-center justify-center rounded-full bg-ink px-5 text-[0.8rem] font-medium lowercase text-paper transition hover:opacity-90 lg:inline-flex"
        >
          post a fit
        </Link>

        {isAuthenticated ? (
          <Link href="/profile" className="shrink-0">
            {user?.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt="my profile"
                className="h-8 w-8 rounded-full border border-white/30 object-cover lg:h-9 lg:w-9"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-pink-soft text-sm font-medium text-ink-soft lg:h-9 lg:w-9">
                {(user?.display_name ?? user?.username ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
