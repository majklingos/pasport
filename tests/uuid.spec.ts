import { test, expect } from "@playwright/test";

// Telefon otevřený přes http://192.168.x.x nemá crypto.randomUUID (jen na HTTPS).
// Aplikace pak hlásila „crypto.randomUUID is not a function“. Tyto testy hlídají náhradu.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Odebere crypto.randomUUID ještě před načtením aplikace – jako na telefonu přes HTTP. */
async function simulateHttpPhone(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    delete (Crypto.prototype as { randomUUID?: unknown }).randomUUID;
  });
}

test("náhradní UUID má správný formát a neopakuje se", async ({ page }) => {
  await page.goto("/");
  const ids: string[] = await page.evaluate(async () => {
    const { uuidFromRandomBytes } = await import("/src/cap/uuid.ts");
    return Array.from({ length: 1000 }, () => uuidFromRandomBytes());
  });
  for (const id of ids) expect(id).toMatch(UUID_V4);
  expect(new Set(ids).size).toBe(ids.length);
});

test("newId funguje i bez crypto.randomUUID", async ({ page }) => {
  await simulateHttpPhone(page);
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { newId } = await import("/src/cap/uuid.ts");
    return { hasRandomUUID: typeof crypto.randomUUID, id: newId() };
  });
  expect(result.hasRandomUUID).toBe("undefined"); // simulace opravdu platí
  expect(result.id).toMatch(UUID_V4);
});

test("ukázkový objekt jde založit bez crypto.randomUUID", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await simulateHttpPhone(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Vyzkoušet na ukázkovém objektu" }).click();

  // Ukázka uloží dva výkresy (obrázky) a spustí zarovnání vrstvy VZT.
  await expect(page.getByText("Zarovnání vrstvy „VZT“")).toBeVisible();
  await expect(page.locator(".toast")).not.toContainText("Nepodařilo");
  expect(errors).toEqual([]);
});
