import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/proxy-image?url=<encoded-url>
 *
 * Fetches an image server-side and returns it with CORS headers so the
 * client-side Canvas can draw it without being tainted. Needed because
 * S3 buckets don't ship CORS headers by default, and setting
 * crossOrigin="anonymous" on an <img> causes the browser to reject the
 * response, firing onerror instead of onload.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // Basic allowlist — only proxy from known S3 / CDN origins
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const allowed =
    parsed.hostname.endsWith(".amazonaws.com") ||
    parsed.hostname.endsWith(".cloudfront.net") ||
    parsed.hostname === "cdn.example.com"; // local dev mock

  if (!allowed) {
    return new NextResponse("Origin not allowed", { status: 403 });
  }

  const upstream = await fetch(url, { cache: "force-cache" });

  if (!upstream.ok) {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("Content-Type") ?? "image/jpeg";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
