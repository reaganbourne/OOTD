"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadFlow } from "@/components/upload/upload-flow";
import { useAuth } from "@/lib/auth-context";

export default function UploadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?next=/upload");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-display text-5xl text-pink-deep">checkd</p>
      </main>
    );
  }

  return (
    <main className="bg-paper">
      <UploadFlow />
    </main>
  );
}
