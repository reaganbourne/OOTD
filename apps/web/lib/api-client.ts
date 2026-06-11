"use client";

// This module has been split into focused files under ./api. It remains as a
// thin re-export shim so existing imports from "@/lib/api-client" keep working.
export * from "./api";
export { apiClient } from "./api";
