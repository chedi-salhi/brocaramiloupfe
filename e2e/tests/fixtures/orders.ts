import { Page, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./auth";

// Ajoute le premier produit disponible du catalogue au panier puis passe
// commande en tant que client connecté (le panier visiteur, s'il y en avait
// un, serait fusionné automatiquement à la connexion — ici on part direct
// connecté pour un test déterministe).
//
// Pour EN_LIGNE, CheckoutForm redirige le navigateur vers PayPal juste après
// la création de la commande (voir checkout-form.tsx) — on ne va pas plus
// loin dans ce flux ici : pas de vrai checkout PayPal automatisable de façon
// stable en CI (site externe, identifiants sandbox non commités). L'id de
// commande est donc lu directement depuis la réponse de "POST /orders"
// plutôt que depuis une redirection qui n'arrive plus pour ce mode, puis on
// abandonne la navigation PayPal en repartant sur l'app. Les scénarios qui
// utilisent EN_LIGNE dans cette suite ne testent que la règle "jamais
// bloqué par la confirmation cash" (voir OrdersService.updateStatus), pas le
// paiement PayPal lui-même.
export async function createOrderAsClient(
  page: Page,
  methode: "A_LA_LIVRAISON" | "EN_LIGNE",
): Promise<number> {
  await loginAs(page, TEST_USERS.client);

  await page.goto("/");
  await page.getByTestId("add-to-cart-button").first().click();

  await page.goto("/panier");
  await page.getByTestId("checkout-address-input").fill("12 rue de la Paix, Tunis");
  await page.getByTestId("checkout-method-select").selectOption(methode);

  const orderResponse = page.waitForResponse(
    (res) => res.request().method() === "POST" && res.url().endsWith("/orders"),
  );
  await page.getByRole("button", { name: "Confirmer la commande" }).click();
  const commande = await (await orderResponse).json();
  const commandeId = commande.idCommande as number;

  if (methode === "EN_LIGNE") {
    await page.goto("/");
  } else {
    await page.waitForURL(/\/client\/commandes\/\d+/);
  }

  await logout(page);
  return commandeId;
}

// Assigne un livreur à une commande depuis le panneau admin. Sélectionne le
// premier livreur disponible dans le <select> (index 1, index 0 = "Choisir
// ...") plutôt qu'un nom en dur : RECOVERY.md ne liste qu'un seul compte
// livreur de test, mais ça reste correct même si d'autres sont ajoutés.
export async function assignLivreurAsAdmin(page: Page, commandeId: number) {
  await loginAs(page, TEST_USERS.admin);
  await page.goto("/admin/commandes");

  const row = page.getByTestId(`admin-order-${commandeId}`);
  await expect(row).toBeVisible();
  await row.locator("select").selectOption({ index: 1 });

  await logout(page);
}
