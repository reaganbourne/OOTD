import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper px-6 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-mute hover:text-ink">‹ back</Link>
        <h1 className="mt-6 font-display text-4xl text-ink">terms of use</h1>
        <p className="mt-3 text-sm text-mute">Last updated May 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-ink-soft">
          <p>
            checkd is a private beta. By creating an account you agree to use the app
            responsibly and only upload content you own or have the right to share.
          </p>
          <p>
            We reserve the right to remove content that violates these terms or is
            otherwise harmful. Full terms will be published before public launch.
          </p>
          <p>
            Questions? Email us at{" "}
            <a href="mailto:hello@checkd.app" className="text-pink-deep hover:underline">
              hello@checkd.app
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
