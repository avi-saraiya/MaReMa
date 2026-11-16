import { expect, test } from "@playwright/test";

// The server runs with MAREMA_FAKE_AI=1 (see playwright.config.ts), so the analysis is a canned result.
const run = Date.now().toString(36);
const USER = `Dana ${run}`;

// A valid 1x1 PNG, so the browser can decode and downscale it like a real photo.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("a supplier checks a photo for repurposing ideas, then lists the detected materials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Your name").fill(USER);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: `Welcome, ${USER}` })).toBeVisible();
  await page.goto("/listings/new");

  // The photo check is only offered for Supply listings.
  const photoCheck = page.getByRole("region", { name: /Could these be repurposed/ });
  await expect(photoCheck).toHaveCount(0);
  await page.getByRole("radio", { name: /Request materials/ }).check();
  await expect(photoCheck).toHaveCount(0);
  await page.getByRole("radio", { name: /Supply materials/ }).check();
  await expect(photoCheck).toBeVisible();

  await expect(page.getByRole("button", { name: "Analyze photo" })).toBeDisabled();
  await page.getByLabel("Photo of the materials").setInputFiles({ name: "jars.png", mimeType: "image/png", buffer: PNG_1X1 });
  await expect(page.getByAltText("Preview of your photo")).toBeVisible();
  await page.getByRole("button", { name: "Analyze photo" }).click();

  const advice = page.getByRole("region", { name: "Repurposing advice" });
  await expect(advice.getByText("These can be repurposed")).toBeVisible();
  await expect(advice.getByRole("listitem").filter({ hasText: "Cardboard boxes (corrugated cardboard)" })).toBeVisible();
  await expect(advice.getByText("Desk organizer.")).toBeVisible();

  // Continuing pre-fills the title and materials, and collapses the panel.
  await advice.getByRole("button", { name: "Continue to listing" }).click();
  await expect(advice).toBeHidden();
  await expect(page.getByText("We filled in the title and materials from your photo.")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Cardboard boxes and glass jars");
  await expect(page.getByLabel("Material 1", { exact: true })).toHaveValue("Cardboard boxes");
  await expect(page.getByLabel("Material 2", { exact: true })).toHaveValue("Glass jars");

  // The rest of the form works as usual, and the photo itself is not submitted.
  const title = `Boxes and jars ${run}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Exchange location").fill("Student union");
  await page.getByLabel("Price ($)").fill("0");
  await page.getByRole("radio", { name: /Light/ }).check();
  await page.getByLabel("Weight (kg)").fill("3");
  await page.getByRole("button", { name: "Create listing" }).click();

  await expect(page).toHaveURL(/\/listings$/);
  const offered = page.getByRole("region", { name: /Materials offered/ });
  await offered.getByRole("link", { name: title }).click();
  await expect(page.getByText("Cardboard boxes")).toBeVisible();
  await expect(page.getByText("Glass jars")).toBeVisible();
});
