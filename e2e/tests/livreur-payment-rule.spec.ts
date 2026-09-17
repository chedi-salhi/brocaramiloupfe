import { test, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./fixtures/auth";
import { createOrderAsClient, assignLivreurAsAdmin } from "./fixtures/orders";

// Couvre la règle métier demandée explicitement par l'utilisateur : une
// commande "à la livraison" ne peut être marquée "Livrée" qu'après
// confirmation du paiement cash (voir OrdersService.updateStatus côté
// backend, et DeliveryStatusForm / PaymentConfirmButton côté frontend).
// Parcours complet sur 3 rôles : client crée la commande, admin assigne un
// livreur, livreur tente de livrer (bloqué), confirme le cash, livre.
test.describe("Règle paiement cash avant livraison", () => {
  test("le livreur ne peut pas marquer livrée avant d'avoir confirmé le cash", async ({
    page,
  }) => {
    const commandeId = await createOrderAsClient(page, "A_LA_LIVRAISON");
    await assignLivreurAsAdmin(page, commandeId);

    await loginAs(page, TEST_USERS.livreur);
    await page.goto("/livreur");

    const order = page.getByTestId(`livreur-order-${commandeId}`);
    await expect(order).toBeVisible();

    // Étape 1 : en attente -> en livraison (pas concerné par la règle cash).
    await order.getByTestId("delivery-status-advance-button").click();
    await expect(order.getByText("En livraison")).toBeVisible();

    // Étape 2 : tenter de livrer sans avoir confirmé le cash -> pas de
    // bouton, juste l'avertissement (voir DeliveryStatusForm.cashNonConfirme).
    await expect(order.getByTestId("cash-not-confirmed-warning")).toBeVisible();
    await expect(order.getByTestId("delivery-status-advance-button")).toHaveCount(0);

    // Étape 3 : confirmer le cash reçu.
    await order.getByTestId("confirm-cash-button").click();
    await expect(order.getByText("✓ Paiement encaissé et confirmé")).toBeVisible();

    // Étape 4 : le bouton "Livrée" redevient disponible, et fonctionne.
    await expect(order.getByTestId("cash-not-confirmed-warning")).toHaveCount(0);
    await order.getByTestId("delivery-status-advance-button").click();
    await expect(order.getByText("Livrée")).toBeVisible();

    await logout(page);
  });

  // Une commande en ligne jamais payée (checkout PayPal non complété — le
  // seul cas testable sans automatiser un vrai paiement PayPal externe, voir
  // fixtures/orders.ts) ne doit JAMAIS apparaître comme confirmée : ni
  // assignable à un livreur, ni progressable. Voir
  // OrdersService.assignLivreur/updateStatus — règle ajoutée après un vrai
  // bug observé (une commande annulée/échouée apparaissait comme confirmée
  // côté admin). Elle est en plus masquée par défaut de la liste (bruit
  // inutile pour l'admin, voir OrdersAdmin.isUnconfirmedEnLigne) : il faut
  // d'abord révéler le filtre.
  test("une commande en ligne non payée ne peut pas être assignée à un livreur", async ({
    page,
  }) => {
    const commandeId = await createOrderAsClient(page, "EN_LIGNE");

    await loginAs(page, TEST_USERS.admin);
    await page.goto("/admin/commandes");

    await expect(page.getByTestId(`admin-order-${commandeId}`)).toHaveCount(0);
    await page.getByTestId("toggle-unconfirmed-orders").click();

    const row = page.getByTestId(`admin-order-${commandeId}`);
    await expect(row).toBeVisible();
    await expect(row.getByText("Paiement en ligne non confirmé")).toBeVisible();
    await expect(row.locator("select")).toBeDisabled();
    await expect(row.getByTestId(`admin-status-EN_LIVRAISON-${commandeId}`)).toBeDisabled();
    await expect(row.getByTestId(`admin-status-LIVREE-${commandeId}`)).toBeDisabled();
    // Seule l'annulation reste possible.
    await expect(row.getByTestId(`admin-status-ANNULEE-${commandeId}`)).toBeEnabled();

    await logout(page);
  });
});
