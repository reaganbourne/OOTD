import type { Metadata } from "next";
import { Fraunces, Instrument_Serif, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { DesktopNav } from "@/components/chrome/desktop-nav";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-display"
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans"
});

// Loaded for CSS usage (logo in nav, etc.)
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["100"],
  axes: ["SOFT", "opsz"],
  variable: "--font-logo"
});

export const metadata: Metadata = {
  title: {
    default: "checkd.",
    template: "%s · checkd."
  },
  description: "your daily fit, kept close, shared with the girls.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_API_URL?.replace(":8000", ":3000") ??
      "https://checkd.vercel.app"
  ),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png", sizes: "512x512" }
    ],
    apple: { url: "/icon", type: "image/png", sizes: "512x512" }
  },
  openGraph: {
    title: "checkd.",
    description: "your daily fit, kept close, shared with the girls.",
    type: "website",
    siteName: "checkd."
  },
  twitter: {
    card: "summary_large_image",
    title: "checkd.",
    description: "your daily fit, kept close, shared with the girls."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${fraunces.variable}`}>
      <body>
        <AuthProvider>
          <DesktopNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
