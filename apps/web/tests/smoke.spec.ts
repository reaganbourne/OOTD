import { expect, test, type Page } from "@playwright/test";

const apiBase = "http://localhost:8000";
const appOrigin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const appHostname = new URL(appOrigin).hostname;
const authUser = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "teststylist",
  email: "test@example.com",
  display_name: "Test Stylist",
  bio: null,
  profile_image_url: null
};

async function mockAuthenticatedApi(page: Page) {
  await page.route(`${apiBase}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const corsHeaders = {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "authorization,content-type",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Origin": appOrigin
    };

    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders
      });
      return;
    }

    if (url.pathname === "/auth/refresh") {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          access_token: "test-access-token",
          token_type: "bearer"
        })
      });
      return;
    }

    if (url.pathname === "/auth/me") {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(authUser)
      });
      return;
    }

    if (url.pathname === "/outfits" && request.method() === "POST") {
      await route.fulfill({
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: "22222222-2222-4222-8222-222222222222",
          user_id: authUser.id,
          image_url: "https://cdn.example.com/outfits/test-fit.jpg",
          caption: "Smoke test fit",
          event_name: null,
          worn_on: null,
          vibe_check_text: null,
          vibe_check_tone: null,
          created_at: "2026-04-26T00:00:00Z",
          updated_at: "2026-04-26T00:00:00Z",
          clothing_items: []
        })
      });
      return;
    }

    await route.fulfill({
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ detail: "Unhandled mocked API route." })
    });
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
}

test.describe("public routes", () => {
  test("landing page links to auth screens", async ({ page }) => {
    await page.goto("/");

    // Heading text reflects the checkd redesign copy
    await expect(
      page.getByRole("heading", {
        name: /your daily fit/i
      })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/signup"
    );
    await expect(page.getByRole("link", { name: /^log in$/i })).toHaveAttribute("href", "/login");
  });

  test("login and signup pages render their forms", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /make your account/i })).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });
});

test.describe("protected routes", () => {
  test("redirect logged-out visitors to login with next path", async ({ page }) => {
    await page.goto("/upload");

    await expect(page).toHaveURL(/\/login\?next=%2Fupload$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("shows upload validation before a photo is selected", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await setActiveSession(page);

    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: /build the look/i })).toBeVisible();

    await page.getByRole("button", { name: /continue to items/i }).click();

    await expect(page.getByText(/a photo is required to create an outfit post/i)).toBeVisible();
    await expect(
      page.getByText(/choose a fit photo before you move to the next step/i)
    ).toBeVisible();
  });

  test("submits a valid mocked outfit upload", async ({ page }) => {
    await mockAuthenticatedApi(page);
    await setActiveSession(page);

    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: /build the look/i })).toBeVisible();

    await page.setInputFiles("input[type='file']", {
      name: "fit.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake image bytes")
    });

    await page.getByRole("button", { name: /continue to items/i }).click();
    await page.getByLabel(/category/i).fill("Dress");
    await page.getByRole("button", { name: /continue to context/i }).click();
    await page.getByLabel(/caption/i).fill("Smoke test fit");
    await page.getByRole("button", { name: /continue to review/i }).click();
    await page.getByRole("button", { name: /submit outfit/i }).click();

    await expect(page.getByText(/outfit uploaded/i)).toBeVisible();
  });
});
