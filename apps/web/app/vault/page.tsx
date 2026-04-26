"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileNav } from "@/components/chrome/mobile-nav";
import { SearchBar } from "@/components/chrome/search-bar";
import { OutfitCard, type OutfitCardData } from "@/components/outfits/outfit-card";
import { useAuth } from "@/lib/auth-context";

const vaultPreviewLooks: OutfitCardData[] = [
  {
    id: "vault-preview-1",
    imageUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    eventName: "City dinner",
    wornOn: "2026-04-24"
  },
  {
    id: "vault-preview-2",
    imageUrl:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    eventName: "Night out",
    wornOn: "2026-04-20"
  },
  {
    id: "vault-preview-3",
    imageUrl:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    eventName: "Weekend brunch",
    wornOn: "2026-04-15"
  },
  {
    id: "vault-preview-4",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    eventName: "Saved",
    wornOn: "2026-04-12"
  },
  {
    id: "vault-preview-5",
    imageUrl:
      "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80",
    eventName: "Spring look",
    wornOn: "2026-04-10"
  },
  {
    id: "vault-preview-6",
    imageUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    eventName: "Saved",
    wornOn: "2026-04-04"
  },
  {
    id: "vault-preview-7",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    eventName: "Black dress",
    wornOn: "2026-03-30"
  },
  {
    id: "vault-preview-8",
    imageUrl:
      "https://images.unsplash.com/photo-1506629905607-d9b1c0a1a8c6?auto=format&fit=crop&w=900&q=80",
    eventName: "Beach trip",
    wornOn: "2026-03-22"
  },
  {
    id: "vault-preview-9",
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    eventName: "Saved",
    wornOn: "2026-03-18"
  }
] as const;

export default function VaultPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
          <section className="soft-panel w-full max-w-xl px-6 py-10 text-center sm:px-8">
            <p className="font-display text-5xl tracking-[-0.08em] text-[#f09ab4]">OOTD</p>
            <h1 className="mt-4 text-4xl text-ink">Checking your session</h1>
            <p className="mt-4 text-sm leading-6 text-plum/82">
              We&apos;re getting your vault entrance ready.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.display_name ?? user?.username ?? user?.email ?? "you";

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[3.4rem] leading-none tracking-[-0.08em] text-[#f09ab4]">
                OOTD
              </p>
              <p className="mt-1 text-sm text-plum/54">{displayName}&rsquo;s vault</p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/feed" className="icon-button" aria-label="Go to feed">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10.5 12 4l8 6.5" />
                  <path d="M6.5 10v8.5h11V10" />
                </svg>
              </Link>
              <button type="button" className="icon-button" aria-label="Vault settings">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 7h16" />
                  <path d="M7 12h10" />
                  <path d="M10 17h4" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SearchBar value="black mini dress" placeholder="Search your vault" />
            <button type="button" className="icon-button" aria-label="Adjust filters">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7h16" />
                <path d="M7 12h10" />
                <path d="M10 17h4" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="filter-chip filter-chip-active">Recent</span>
            <span className="filter-chip">Color</span>
            <span className="filter-chip">Event</span>
            <span className="filter-chip">Category</span>
            <span className="filter-chip">Saved</span>
          </div>
        </header>

        <section className="mb-5 rounded-[1.6rem] border border-rose/10 bg-white px-4 py-4 text-sm leading-6 text-plum/62 shadow-[0_16px_40px_rgba(244,106,147,0.06)] sm:px-5">
          Previewing the vault shell while live search, filters, and your real saved looks
          finish wiring into the frontend.
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {vaultPreviewLooks.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              showAuthor={false}
              showCaption={false}
              showAccentMarker
            />
          ))}
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            href="/feed"
            className="rounded-full border border-rose/12 bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:border-rose/22"
          >
            Back to your feed
          </Link>
        </div>
      </div>
      <MobileNav active="vault" />
    </main>
  );
}
