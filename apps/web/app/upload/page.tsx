"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadFlow } from "@/components/upload/upload-flow";
import { useAuth } from "@/lib/auth-context";

export default function UploadPage() {
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
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
              Upload flow
            </p>
            <h1 className="mt-4 text-4xl text-ink">Opening your upload studio</h1>
            <p className="mt-4 text-sm leading-6 text-plum/82">
              We&apos;re checking your session before we load the outfit builder.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.display_name ?? user?.username ?? "stylist";

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-plum/70">
              Outfit upload
            </p>
            <h1 className="mt-2 text-4xl text-ink sm:text-5xl">
              Build the look before you post the memory.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-plum/82 sm:text-base">
              Hi, {displayName}. Add the photo, tag what you wore, and send the outfit
              straight into your vault in one clean flow.
            </p>
          </div>

          <Link
            href="/vault"
            className="rounded-[1.25rem] border border-plum/15 bg-white/80 px-4 py-3 text-sm font-semibold text-plum transition hover:bg-white"
          >
            Back to vault
          </Link>
        </div>

        <UploadFlow />
      </div>
    </main>
  );
}
