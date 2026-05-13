import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthMode } from "@/lib/auth";

type AuthShellProps = {
  mode: AuthMode;
  children: ReactNode;
};

const shellCopy = {
  login: {
    heading: "log in",
    headingSize: 40,
    headingMarginTop: 8,
    eyebrow: "welcome back.",
    alternateLabel: "new here?",
    alternateHref: "/signup",
    alternateCta: "create account"
  },
  signup: {
    heading: "create account",
    headingSize: 40,
    headingMarginTop: 8,
    eyebrow: "welcome. let's set you up.",
    alternateLabel: "have an account?",
    alternateHref: "/login",
    alternateCta: "log in"
  }
} as const;

export function AuthShell({ mode, children }: AuthShellProps) {
  const copy = shellCopy[mode];

  return (
    <main className="flex min-h-screen flex-col bg-paper" style={{ padding: "20px 28px 0" }}>
      {/* ‹ back — plain text link, exactly as in design */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/"
          className="text-ink-soft transition hover:text-ink"
          style={{ fontSize: 13 }}
        >
          ‹ back
        </Link>
      </div>

      <div className="flex flex-1 flex-col" style={{ paddingBottom: 32 }}>
        {/* Heading — serif italic per design */}
        <h1
          className="font-display italic text-ink"
          style={{
            fontSize: copy.headingSize,
            margin: `${copy.headingMarginTop}px 0 0`,
            letterSpacing: "-0.01em",
            lineHeight: 1.1
          }}
        >
          {copy.heading}
        </h1>
        <p className="text-mute" style={{ fontSize: 13, marginTop: 8 }}>
          {copy.eyebrow}
        </p>

        <div style={{ marginTop: 28 }}>
          {children}
        </div>

        <p className="mt-5 text-center text-sm text-mute">
          {copy.alternateLabel}{" "}
          <Link
            href={copy.alternateHref}
            className="text-ink underline-offset-2 transition hover:underline"
          >
            {copy.alternateCta}
          </Link>
        </p>
      </div>
    </main>
  );
}
