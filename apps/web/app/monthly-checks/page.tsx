import { Suspense } from "react";
import { MonthlyChecksClient } from "@/components/monthly-checks/monthly-checks-client";

function LoadingState() {
  return (
    <main className="flex h-screen items-center justify-center" style={{ background: "var(--ink)" }}>
      <p className="font-display italic text-5xl" style={{ color: "var(--pink)" }}>checkd</p>
    </main>
  );
}

export default function MonthlyChecksPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MonthlyChecksClient />
    </Suspense>
  );
}
