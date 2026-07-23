import { test, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./fixtures/auth";

test.describe("Client — passer une commande", () => {
  test("ajoute un produit, checkout, retrouve la commande dans « Mes commandes »", async ({
    page,
  }) => {
    await loginAs(page, TEST_USERS.client);

    await page.goto("/");
    await page.getByTestId("add-to-cart-button").first().click();

    await page.goto("/panier");
    await page.getByTestId("checkout-address-input").fill("12 rue de la Paix, Tunis");
    await page.getByTestId("checkout-method-select").selectOption("A_LA_LIVRAISON");
    await page.getByRole("button", { name: "Confirmer la commande" }).click();

    // CheckoutForm redirige vers /client/commandes/:id à la création.
    await page.waitForURL(/\/client\/commandes\/\d+/);
    const commandeId = page.url().match(/\/client\/commandes\/(\d+)/)?.[1];
    expect(commandeId).toBeTruthy();

    await page.goto("/client/commandes");
    await expect(page.getByText(`Commande #${commandeId}`)).toBeVisible();
    await expect(page.getByText("En attente")).toBeVisible();

    await logout(page);
  });
});
