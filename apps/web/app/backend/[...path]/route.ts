import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_BACKEND_ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://api.ootd.app"
    : "http://127.0.0.1:8000";
const PROXY_PREFIX = "/backend";

function getBackendOrigin() {
  const origin =
    process.env.INTERNAL_API_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_BACKEND_ORIGIN;

  return origin.replace(/\/+$/, "");
}

function getProxyOrigin(request: NextRequest) {
  return `${request.nextUrl.origin}${PROXY_PREFIX}`;
}

function getCandidateOrigins(origin: string) {
  const candidates = new Set([origin]);

  if (origin.includes("127.0.0.1")) {
    candidates.add(origin.replace("127.0.0.1", "localhost"));
  }

  if (origin.includes("localhost")) {
    candidates.add(origin.replace("localhost", "127.0.0.1"));
  }

  return [...candidates];
}

function rewriteBodyUrls(body: string, request: NextRequest) {
  let rewritten = body;

  for (const origin of getCandidateOrigins(getBackendOrigin())) {
    rewritten = rewritten.split(origin).join(getProxyOrigin(request));
  }

  return rewritten;
}

function rewriteSetCookie(setCookie: string) {
  // Proxy serves auth routes at /backend/auth but the backend issues the
  // refresh-token cookie with Path=/auth.  Widen the path to / so the browser
  // sends the cookie on every same-origin request regardless of path prefix.
  return setCookie.replace(/Path=\/[^;]*/gi, "Path=/");
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  headers.set("x-forwarded-host", request.headers.get("host") ?? request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  return headers;
}

async function proxy(request: NextRequest, path: string[]) {
  const backendOrigin = getBackendOrigin();
  const upstreamUrl = new URL(`${backendOrigin}/${path.join("/")}`);
  upstreamUrl.search = request.nextUrl.search;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body,
    redirect: "manual"
  });

  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-length");
  headers.delete("access-control-allow-origin");
  headers.delete("access-control-allow-credentials");
  headers.delete("access-control-allow-methods");
  headers.delete("access-control-allow-headers");

  const setCookie = upstreamResponse.headers.get("set-cookie");
  if (setCookie) {
    headers.set("set-cookie", rewriteSetCookie(setCookie));
  }

  const location = upstreamResponse.headers.get("location");
  if (location) {
    headers.set("location", rewriteBodyUrls(location, request));
  }

  // 204/304 carry no body — return immediately to avoid stream issues
  if (upstreamResponse.status === 204 || upstreamResponse.status === 304) {
    return new NextResponse(null, { status: upstreamResponse.status, headers });
  }

  const contentType = upstreamResponse.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || contentType.startsWith("text/")) {
    const body = await upstreamResponse.text();
    return new NextResponse(rewriteBodyUrls(body, request), {
      status: upstreamResponse.status,
      headers
    });
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  return proxy(request, path);
}
