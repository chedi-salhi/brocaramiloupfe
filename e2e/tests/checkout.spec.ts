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
    // getByText("En attente") est ambigu ici : workers=1/fullyParallel=false
    // (voir playwright.config.ts) font tourner tous les specs sur la même
    // base, donc les commandes créées par des tests précédents dans la même
    // run (admin-orders, livreur-payment-rule) sont encore "En attente" au
    // moment où ce test s'exécute — strict mode violation (plusieurs badges
    // matchés). On scope sur la ligne de la commande qu'on vient de créer.
    const ligneCommande = page.getByTestId(`commande-row-${commandeId}`);
    await expect(ligneCommande.getByText(`Commande #${commandeId}`)).toBeVisible();
    await expect(ligneCommande.getByText("En attente")).toBeVisible();

    await logout(page);
  });
});
