import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

import { installConvexFixture } from "./convex-fixture";

test("renders the chosen language and preserves locale changes on reload", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "locale", value: "en", url: baseURL }]);

  // Inline streaming scripts can reveal content while hydration bundles stay blocked.
  await page.route("**/_next/static/**/*.js", async (route) => {
    await route.abort();
  });
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(
    page.locator('label[for="displayName"]:lang(en)').filter({ visible: true }),
  ).toHaveText("Display Name");

  await page.unroute("**/_next/static/**/*.js");
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#displayName").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Select Language" }).click();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator("#displayName").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Seleccionar idioma" }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("renders the lobby loading shell on an initial visit", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "locale", value: "en", url: baseURL }]);

  await page.goto("/lobby/ABC234");

  await expect(page.getByRole("heading", { name: "ChronoTunes", exact: true })).toBeVisible();
  await expect(
    page.getByText("Music Timeline Game", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.locator('[aria-busy="true"]').filter({ visible: true })).toBeVisible();
});

test("prefetches the return-home Link and retries a locale change after reconnecting", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "locale", value: "en", url: baseURL }]);
  await page.goto("/missing-route");
  const homeLink = page.getByRole("link", { name: "Return Home" });
  await expect(homeLink).toBeVisible();

  await instant(page, async () => {
    await homeLink.click();
    await page.waitForURL("/");
    await expect(page.locator("#displayName").filter({ visible: true })).toBeVisible();
  });

  await context.setOffline(true);
  await page.getByRole("button", { name: "Select Language" }).click();
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/offline/i);
  await expect(page.getByRole("button", { name: "Select Language" })).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await context.setOffline(false);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("joins an instant lobby shell, restores it offline, and resolves live state on reconnect", async ({
  page,
  context,
  baseURL,
}) => {
  const convex = await installConvexFixture(page);
  await context.addCookies([{ name: "locale", value: "en", url: baseURL }]);
  await page.goto("/");
  await page.getByLabel("Display Name").fill("Listener");
  await page.getByRole("button", { name: "Join Game", exact: true }).click();
  await page.getByLabel("Lobby Code").fill("ABC234");

  await instant(page, async () => {
    await page.getByRole("button", { name: "Join Game", exact: true }).click();
    await page.waitForURL("/lobby/ABC234");
    await expect(page.getByRole("heading", { name: "ChronoTunes", exact: true })).toBeVisible();
    await expect(page.locator('[aria-busy="true"]').filter({ visible: true })).toBeVisible();
  });

  await page.goBack();
  await expect(page.locator("#displayName").filter({ visible: true })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole("status")).toContainText(/offline/i);
  await page.goForward();
  await page.waitForURL("/lobby/ABC234");
  await expect(page.getByRole("heading", { name: "ChronoTunes", exact: true })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]').filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/offline/i);
  await context.setOffline(false);
  convex.releaseLobby();
  await expect(page.getByText("Lobby not found", { exact: true })).toBeVisible();
  await instant(page, async () => {
    await page.getByRole("link", { name: "Return Home" }).click();
    await page.waitForURL("/");
    await expect(page.getByLabel("Display Name")).toHaveValue("Listener");
  });
});
