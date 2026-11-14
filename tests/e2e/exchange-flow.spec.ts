import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { E2E_DATABASE_URL } from "../../playwright.config";

const db = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });

// Unique names per run, so the e2e database never needs resetting.
const run = Date.now().toString(36);
const ALICE = `Alice ${run}`;
const BOB = `Bob ${run}`;
const CAROL = `Carol ${run}`;
const TITLE = `Surplus lumber ${run}`;

async function login(page: Page, name: string) {
  await page.goto("/login");
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: `Welcome, ${name}` })).toBeVisible();
}

async function sessionCookie(page: Page) {
  return (await page.context().cookies()).find((c) => c.name === "userId")?.value;
}

test.afterAll(() => db.$disconnect());

test("redirects to login when not signed in", async ({ page }) => {
  await page.goto("/listings");
  await expect(page).toHaveURL(/\/login$/);
});

test("create a supply listing, then another user accepts it", async ({ page, browser }) => {
  test.setTimeout(60_000);
  // Alice creates a listing via the Create Listing tile.
  await login(page, ALICE);
  const aliceId = await sessionCookie(page);
  await page.getByRole("link", { name: /Create Listing/ }).click();
  await expect(page).toHaveURL(/\/listings\/new$/);

  // Client-side validation blocks an empty submission.
  await page.getByRole("button", { name: "Create listing" }).click();
  await expect(page.getByText("Choose whether you are supplying or requesting materials.")).toBeVisible();
  await expect(page.getByText("Please enter a title.")).toBeVisible();
  await expect(page.getByText("Add at least one material.")).toBeVisible();
  await expect(page).toHaveURL(/\/listings\/new$/);

  await page.getByRole("radio", { name: /Supply materials/ }).check();
  await page.getByLabel("Title").fill(TITLE);
  await page.getByLabel("Material 1", { exact: true }).fill("2x4 studs");
  await page.getByRole("button", { name: "+ Add another material" }).click();
  await page.getByLabel("Material 2", { exact: true }).fill("Plywood sheets");
  await page.getByLabel("Exchange location").fill("Engineering loading dock");
  await page.getByLabel("Price ($)").fill("4.50");
  await page.getByRole("button", { name: "Create listing" }).click();

  // It appears under Supply only.
  await expect(page).toHaveURL(/\/listings$/);
  const offered = page.getByRole("region", { name: /Materials offered/ });
  const requested = page.getByRole("region", { name: /Materials requested/ });
  await expect(offered.getByRole("link", { name: TITLE })).toBeVisible();
  await expect(requested.getByRole("link", { name: TITLE })).toHaveCount(0);

  // The creator sees the details but cannot accept.
  await offered.getByRole("link", { name: TITLE }).click();
  await expect(page).toHaveURL(/\/listings\/[0-9a-f-]{36}$/);
  const detailUrl = page.url();
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(page.getByText("2x4 studs")).toBeVisible();
  await expect(page.getByText("Plywood sheets")).toBeVisible();
  await expect(page.getByText("Engineering loading dock")).toBeVisible();
  await expect(page.getByText("$4.50")).toBeVisible();
  await expect(page.getByRole("article").getByText(ALICE)).toBeVisible();
  await expect(page.getByText("This is your listing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Carol opens the listing in her own browser session but doesn't accept yet.
  const carolContext = await browser.newContext();
  const carolPage = await carolContext.newPage();
  await login(carolPage, CAROL);
  await carolPage.goto(detailUrl);
  await expect(carolPage.getByRole("button", { name: "Accept" })).toBeVisible();

  // Bob accepts first.
  await login(page, BOB);
  await page.goto(detailUrl);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page).toHaveURL(/\/listings\?accepted=1$/);
  await expect(page.getByRole("status")).toContainText("Listing accepted");
  await expect(page.getByRole("link", { name: TITLE })).toHaveCount(0);

  // Carol's stale Accept is refused with an inline error.
  await carolPage.getByRole("button", { name: "Accept" }).click();
  await expect(carolPage.getByText("Someone else has already accepted this listing.")).toBeVisible();
  await carolContext.close();

  // The listing still exists, now ACTIVE and attributed to Bob.
  const listing = await db.listing.findFirstOrThrow({ where: { title: TITLE }, include: { acceptedBy: true } });
  expect(listing.status).toBe("ACTIVE");
  expect(listing.acceptedBy?.name).toBe(BOB);
  expect(listing.acceptedAt).not.toBeNull();

  // Logging in again as Alice reuses the same user.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, ALICE);
  expect(await sessionCookie(page)).toBe(aliceId);
  expect(await db.user.count({ where: { name: ALICE } })).toBe(1);
});
