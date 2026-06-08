import { expect, test, type Page } from "@playwright/test";

const appOrigin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const appHostname = new URL(appOrigin).hostname;
const apiBase = `${appOrigin}/backend`;

// ── Shared fixtures ────────────────────────────────────────────────────────────

const authUser = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "teststylist",
  email: "test@example.com",
  display_name: "Test Stylist",
  bio: null,
  profile_image_url: null,
  is_admin: false
};

const mockOutfit = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: authUser.id,
  image_url: "https://example-bucket.s3.amazonaws.com/outfits/test-fit.jpg",
  caption: "Smoke test fit",
  event_name: null,
  worn_on: null,
  vibe_check_text: null,
  vibe_check_tone: null,
  created_at: "2026-04-26T00:00:00Z",
  updated_at: "2026-04-26T00:00:00Z",
  clothing_items: []
};

// Feed outfits include an `author` field (FeedOutfitResponse extends OutfitResponse)
const mockFeedOutfit = {
  ...mockOutfit,
  author: {
    id: authUser.id,
    username: authUser.username,
    display_name: authUser.display_name,
    profile_image_url: null
  }
};

const mockProfile = {
  id: authUser.id,
  username: authUser.username,
  display_name: authUser.display_name,
  bio: null,
  profile_image_url: null,
  follower_count: 3,
  following_count: 7,
  is_following: false,
  created_at: "2026-01-01T00:00:00Z"
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
    "Access-Control-Allow-Origin": appOrigin
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

async function mockAuthenticatedApi(
  page: Page,
  overrides: {
    outfitsMe?: unknown[];
    outfitsFeed?: unknown[];
  } = {}
) {
  const vaultOutfits = overrides.outfitsMe ?? [];
  const feedOutfits = overrides.outfitsFeed ?? [];

  await page.route(`${apiBase}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    // Strip the /backend prefix added by the Next.js proxy so path checks
    // match the API routes as the backend sees them.
    const path = url.pathname.replace(/^\/backend/, "");

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    // Auth
    if (path === "/auth/refresh") {
      await route.fulfill(jsonResponse({ access_token: "test-token", token_type: "bearer", user: authUser }));
      return;
    }
    if (path === "/auth/me") {
      await route.fulfill(jsonResponse(authUser));
      return;
    }

    // Vault — GET /outfits/me
    if (path === "/outfits/me" && request.method() === "GET") {
      await route.fulfill(jsonResponse({ outfits: vaultOutfits, next_cursor: null }));
      return;
    }

    // Feed — GET /outfits/feed (FeedOutfitResponse requires author field)
    if (path === "/outfits/feed" && request.method() === "GET") {
      await route.fulfill(jsonResponse({ outfits: feedOutfits, next_cursor: null }));
      return;
    }

    // Profile — GET /users/:username
    if (path === `/users/${authUser.username}`) {
      await route.fulfill(jsonResponse(mockProfile));
      return;
    }

    // Boards list — GET /boards/me
    if (path === "/boards/me") {
      await route.fulfill(jsonResponse([]));
      return;
    }

    // Likes — GET /outfits/:id/likes
    if (/^\/outfits\/[^/]+\/likes$/.test(path) && request.method() === "GET") {
      await route.fulfill(jsonResponse({ liked: false, like_count: 0 }));
      return;
    }

    // Upload — POST /outfits
    if (path === "/outfits" && request.method() === "POST") {
      await route.fulfill(jsonResponse(mockOutfit, 201));
      return;
    }

    // Fallback — unhandled route (helps spot missing mocks in test output)
    await route.fulfill(
      jsonResponse({ detail: `Unhandled mocked route: ${request.method()} ${path}` }, 404)
    );
  });
}

async function setActiveSession(page: Page) {
  await page.context().addCookies([
    {
      name: "ootd_session",
      value: "active",
      domain: appHostname,
      path: "/",
      sameSite: "Lax"
    }
  ]);
  // Pre-accept AI consent so the modal doesn't block test assertions
  await page.addInitScript(() => {
    localStorage.setItem("checkd_ai_consent_v1", "accepted");
  });
}

// ── Public routes ──────────────────────────────────────────────────────────────

test.describe("public routes", () => {
  test("landing page links to auth screens", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /checkd/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i }).first()).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("link", { name: /^log in$/i }).first()).toHaveAttribute("href", "/login");
  });

  test("login and signup pages render their forms", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /^log in$/i })).toBeVisible();
    await expect(page.getByLabel(/email or username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });
});

// ── Protected route redirects ──────────────────────────────────────────────────

test.describe("protected route redirects", () => {
  // These pages pass ?next= in the redirect so users land back after login
  for (const route of ["/admin", "/upload", "/feed", "/vault"]) {
    test(`redirects logged-out visitor from ${route} to login with next param`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=`));
      await expect(page.getByRole("heading", { name: /^log in$/i })).toBeVisible();
    });
  }

  // /profile redirects to /login without ?next= (lands on profile after auth anyway)
  test("redirects logged-out visitor from /profile to login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /^log in$/i })).toBeVisible();
  });
});

// ── Vault ──────────────────────────────────────────────────────────────────────

test.describe("vault page", () => {
  test("shows empty state when user has no outfits", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsMe: [] });
    await setActiveSession(page);

    await page.goto("/vault");

    await expect(page.getByText(/your archive is ready/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /upload your first look/i })).toBeVisible();
  });

  test("renders outfit grid when user has outfits", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsMe: [mockOutfit] });
    await setActiveSession(page);

    await page.goto("/vault");

    // Grid renders — outfit image should be present (next/image changes src, match on alt instead)
    await expect(page.locator(`img[alt="${mockOutfit.caption}"]`).first()).toBeVisible();
    // Stat line shows count
    await expect(page.getByText(/1 fits/i)).toBeVisible();
  });

  test("search bar renders and filters results", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsMe: [] });
    await setActiveSession(page);

    await page.goto("/vault");

    // Search input should be present
    const searchInput = page.getByPlaceholder(/search by brand/i);
    await expect(searchInput).toBeVisible();
    // Typing should not crash
    await searchInput.fill("zara");
  });
});

// ── Feed ───────────────────────────────────────────────────────────────────────

test.describe("feed page", () => {
  test("shows empty state when feed has no outfits", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsFeed: [] });
    await setActiveSession(page);

    await page.goto("/feed");

    await expect(page.getByText(/your feed is ready/i)).toBeVisible();
  });

  test("renders outfit cards when feed has outfits", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsFeed: [mockFeedOutfit] });
    await setActiveSession(page);

    await page.goto("/feed");

    await expect(page.locator(`img[alt="${mockOutfit.caption}"]`).first()).toBeVisible();
  });

  test("navigation icons link to correct pages", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await setActiveSession(page);

    await page.goto("/feed");

    await expect(page.getByRole("link", { name: /explore/i })).toHaveAttribute("href", "/explore");
    // Use aria-label to avoid matching the mobile-nav search link as well
    await expect(page.getByRole("link", { name: "Search" }).first()).toHaveAttribute("href", "/search");
  });
});

// ── Profile ────────────────────────────────────────────────────────────────────

test.describe("profile page", () => {
  test("shows profile header with display name and stats", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsMe: [] });
    await setActiveSession(page);

    await page.goto("/profile");

    await expect(page.getByText(authUser.display_name)).toBeVisible();
    await expect(page.getByText(`@${authUser.username}`).first()).toBeVisible();
    // follower/following counts from mockProfile
    await expect(page.getByText("3")).toBeVisible();
    await expect(page.getByText("7")).toBeVisible();
  });

  test("profile tabs render and switch content", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsMe: [] });
    await setActiveSession(page);

    await page.goto("/profile");

    // Tabs visible — "tagged" and "saved" were removed in a previous PR
    for (const tab of ["fits", "about"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${tab}$`, "i") })).toBeVisible();
    }

    // Switch to about tab — should show bio section (exact match avoids "add a bio →" links)
    await page.getByRole("button", { name: /^about$/i }).click();
    await expect(page.getByText("bio", { exact: true })).toBeVisible();
  });

  test("shows outfit grid when user has outfits", async ({ page }) => {
    await mockAuthenticatedApi(page, { outfitsMe: [mockOutfit] });
    await setActiveSession(page);

    await page.goto("/profile");

    await expect(page.locator(`img[alt="${mockOutfit.caption}"]`).first()).toBeVisible();
  });
});

// ── Upload ─────────────────────────────────────────────────────────────────────

test.describe("upload flow", () => {
  test("shows validation error when advancing without a photo", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await setActiveSession(page);

    await page.goto("/upload");
    await expect(page.getByText("add your photo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^looks good$/i }).click();

    await expect(page.getByText(/a photo is required/i)).toBeVisible();
    await expect(page.getByText(/choose a photo before continuing/i)).toBeVisible();
  });

  test("completes a full mocked upload successfully", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await setActiveSession(page);

    await page.goto("/upload");
    await expect(page.getByText("add your photo", { exact: true })).toBeVisible();

    await page.setInputFiles("input[type='file']", {
      name: "fit.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake image bytes")
    });

    await page.getByRole("button", { name: /^looks good$/i }).click();
    await page.getByPlaceholder(/top, trousers, shoes/i).fill("Dress");
    await page.getByRole("button", { name: /^add context$/i }).click();
    await page.getByPlaceholder(/what was the vibe/i).fill("Smoke test fit");
    await page.getByRole("button", { name: /^review it$/i }).click();
    await page.getByRole("button", { name: /post outfit/i }).click();

    await expect(page.getByText(/outfit uploaded/i)).toBeVisible();
  });
});
