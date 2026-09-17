import { test, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./fixtures/auth";
import { createOrderAsClient, assignLivreurAsAdmin } from "./fixtures/orders";

// Même règle métier que livreur-payment-rule.spec.ts, mais vue depuis le
// panneau admin (/admin/commandes) — l'admin peut aussi confirmer le cash
// et marquer livré directement, avec le même garde-fou (voir
// OrdersAdmin.tsx : bouton "Livrée" désactivé + tooltip tant que le
// paiement cash n'est pas confirmé). Vérifie aussi qu'une fois la commande
// clôturée (Livrée ou Annulée) : le livreur assigné s'affiche en texte
// simple au lieu du <select> modifiable, ET les boutons de statut
// disparaissent entièrement (voir OrdersService.updateStatus, qui refuse
// désormais toute modification d'une commande déjà Livrée/Annulée).
test.describe("Panneau admin — commandes", () => {
  test("bouton Livrée désactivé tant que le cash n'est pas confirmé, puis clôture", async ({
    page,
  }) => {
    const commandeId = await createOrderAsClient(page, "A_LA_LIVRAISON");
    await assignLivreurAsAdmin(page, commandeId);

    await loginAs(page, TEST_USERS.admin);
    await page.goto("/admin/commandes");

    const row = page.getByTestId(`admin-order-${commandeId}`);
    await expect(row).toBeVisible();

    // Le select livreur est visible tant que la commande n'est pas clôturée.
    await expect(row.locator("select")).toBeVisible();

    const livreeButton = row.getByTestId(`admin-status-LIVREE-${commandeId}`);
    await expect(livreeButton).toBeDisabled();

    await row.getByTestId("confirm-cash-button").click();
    await expect(row.getByText("✓ Paiement encaissé et confirmé")).toBeVisible();
    await expect(livreeButton).toBeEnabled();

    await livreeButton.click();

    // Commande clôturée : le <select> livreur disparaît au profit d'un texte
    // "Livreur : ...", et les 4 boutons de statut (dont livreeButton
    // lui-même) disparaissent entièrement au profit de "Statut définitif" —
    // le badge en tête de carte reste le seul indicateur de statut.
    await expect(row.locator("select")).toHaveCount(0);
    await expect(row.getByText("Livreur :")).toBeVisible();
    await expect(livreeButton).toHaveCount(0);
    await expect(row.getByText("Statut définitif")).toBeVisible();

    await logout(page);
  });

  // Une commande en ligne jamais payée (checkout PayPal non complété) ne
  // doit jamais pouvoir être clôturée comme une commande normale — seule
  // l'annulation reste possible, et elle restitue bien le panier (voir
  // OrdersService.cancel). Remplace l'ancien test "le paiement en ligne
  // autorise la clôture en un clic", qui reposait sur l'ancien comportement
  // (bug corrigé : une commande en ligne non payée apparaissait comme
  // confirmée côté admin).
  test("une commande en ligne non payée ne peut être qu'annulée depuis le panneau admin", async ({
    page,
  }) => {
    const commandeId = await createOrderAsClient(page, "EN_LIGNE");

    await loginAs(page, TEST_USERS.admin);
    await page.goto("/admin/commandes");

    // Masquée par défaut (pas confirmée par le client) — il faut d'abord
    // révéler le filtre pour agir dessus.
    await expect(page.getByTestId(`admin-order-${commandeId}`)).toHaveCount(0);
    await page.getByTestId("toggle-unconfirmed-orders").click();

    const row = page.getByTestId(`admin-order-${commandeId}`);
    await expect(row).toBeVisible();
    await expect(row.locator("select")).toBeDisabled();
    await expect(row.getByTestId(`admin-status-EN_LIVRAISON-${commandeId}`)).toBeDisabled();
    await expect(row.getByTestId(`admin-status-LIVREE-${commandeId}`)).toBeDisabled();

    const annulerButton = row.getByTestId(`admin-status-ANNULEE-${commandeId}`);
    await expect(annulerButton).toBeEnabled();
    page.once("dialog", (dialog) => dialog.accept());
    await annulerButton.click();

    await expect(row.getByText("Statut définitif")).toBeVisible();
    await expect(annulerButton).toHaveCount(0);

    await logout(page);
  });

  test("une commande annulée ne peut plus être modifiée (confirmation requise)", async ({
    page,
  }) => {
    const commandeId = await createOrderAsClient(page, "A_LA_LIVRAISON");

    await loginAs(page, TEST_USERS.admin);
    await page.goto("/admin/commandes");

    const row = page.getByTestId(`admin-order-${commandeId}`);
    // Playwright rejette les window.confirm() par défaut (équivalent à
    // "Annuler") sauf handler explicite — sans ça, updateStatus() côté
    // OrdersAdmin retournerait tôt et l'annulation n'aurait jamais lieu.
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByTestId(`admin-status-ANNULEE-${commandeId}`).click();

    await expect(row.getByText("Statut définitif")).toBeVisible();
    await expect(row.getByTestId(`admin-status-ANNULEE-${commandeId}`)).toHaveCount(0);
  });
});
