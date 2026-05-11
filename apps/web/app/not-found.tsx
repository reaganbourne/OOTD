import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-5">
      <div className="w-full max-w-[360px] text-center">
        <p className="font-display italic text-4xl text-pink-deep mb-8">checkd</p>
        <div className="soft-panel px-6 py-10">
          <p className="font-display text-6xl text-ink/10 mb-4">404</p>
          <h1 className="font-display text-2xl tracking-[-0.03em] text-ink mb-2">
            page not found
          </h1>
          <p className="text-sm leading-6 text-ink-soft mb-6">
            This page doesn&apos;t exist or was moved.
          </p>
          <Link href="/feed" className="btn-primary w-full">
            go to feed
          </Link>
        </div>
      </div>
    </main>
  );
}
