import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS } from "./fixtures/auth";

// Vérifie le point "Chatbox client ↔ admin" du cahier des charges : deux
// contextes de navigateur distincts (un par utilisateur, chacun avec ses
// propres cookies/session) connectés en simultané, pour tester la vraie
// livraison temps réel via Socket.io (ChatGateway) plutôt qu'un simple
// aller-retour REST. Deux contextes plutôt qu'un seul page réutilisée comme
// dans les autres specs : on évite ainsi complètement la course
// logout()/loginAs() qui a posé problème ailleurs dans cette suite (voir
// fixtures/auth.ts) puisqu'aucune déconnexion n'a lieu ici.
//
// Contenu des messages marqué d'un suffixe unique par run pour ne jamais
// matcher un message laissé par une exécution précédente (base partagée sur
// toute la durée de la suite, voir playwright.config.ts : workers: 1).
test.describe("Messagerie temps réel client <-> admin", () => {
  test("un message envoyé par le client apparaît en direct côté admin, et vice-versa", async ({
    browser,
  }) => {
    // Deux connexions Keycloak complètes + deux sockets à établir dans un
    // seul test : plus lourd que la moyenne de la suite, on lui laisse donc
    // plus de marge (x3 le timeout par défaut) plutôt que de risquer un
    // faux échec sous charge Docker.
    test.slow();

    const marqueur = Date.now();
    const messageClient = `Bonjour, question sur ma commande (${marqueur})`;
    const messageAdmin = `Bonjour, je regarde ça tout de suite (${marqueur})`;

    const adminContext = await browser.newContext();
    const clientContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const clientPage = await clientContext.newPage();

    try {
      // Connexion séquentielle (pas en parallèle) : le flux OIDC Keycloak
      // est déjà le point le plus fragile de cette suite ailleurs, pas la
      // peine d'ajouter de la contention en connectant les deux comptes en
      // même temps.
      await loginAs(adminPage, TEST_USERS.admin);
      await loginAs(clientPage, TEST_USERS.client);

      // Admin ouvre la messagerie et sélectionne le contact "client" —
      // recherche par nom insensible à la casse : le realm Keycloak local
      // (recreate-keycloak-users.ps1) et celui de CI (ci-realm-export.json)
      // ne capitalisent pas "Fares Salhi" de la même façon.
      await adminPage.goto("/admin/messages");
      await adminPage
        .getByRole("button", { name: /fares\s+salhi/i })
        .click();

      // Client ouvre la bulle de chat flottante (montée globalement dans
      // layout.tsx) — elle ne rend rien tant que GET /messages/contact n'a
      // pas résolu (voir ChatWidget : "if (!contact) return null"). Timeout
      // à 30s (pas 15s) : ce test ouvre DEUX sessions authentifiées en
      // parallèle (admin + client) sur la même stack Docker CI partagée
      // (2 vCPU) — vu en CI (run #34) un dépassement net de 15s ici alors
      // que le même test passe en ~9s en local, cohérent avec un simple
      // ralentissement SSR/session sous charge plutôt qu'un vrai bug
      // (`/messages/contact` répond bien, juste plus lentement). test.slow()
      // ci-dessus triple le timeout du test global mais PAS les timeouts
      // explicites comme celui-ci, d'où l'ajustement manuel.
      await clientPage.goto("/");
      const bulleChat = clientPage.getByRole("button", { name: "Ouvrir le chat" });
      await expect(bulleChat).toBeVisible({ timeout: 30_000 });
      await bulleChat.click();

      const champClient = clientPage.getByPlaceholder("Écrire un message...");
      await expect(champClient).toBeVisible();
      await champClient.fill(messageClient);
      await champClient.press("Enter");

      // Le client voit son propre message : confirme que le serveur a bien
      // persisté le message ET renvoyé l'écho Socket.io à l'expéditeur
      // (ChatWidget n'affiche rien en local avant cet écho, voir send()).
      await expect(clientPage.getByText(messageClient)).toBeVisible({ timeout: 10_000 });

      // Côté admin, aucune action manuelle (pas de clic "actualiser") : si
      // ce message apparaît, c'est que le serveur l'a poussé en direct dans
      // la room "user:<idAdmin>" pendant que l'onglet était déjà ouvert sur
      // ce fil — la preuve du temps réel demandée par le cahier des charges.
      await expect(adminPage.getByText(messageClient)).toBeVisible({ timeout: 10_000 });

      // Réponse de l'admin, même vérification dans l'autre sens.
      const champAdmin = adminPage.getByPlaceholder("Écrire un message...");
      await champAdmin.fill(messageAdmin);
      await champAdmin.press("Enter");

      await expect(adminPage.getByText(messageAdmin)).toBeVisible({ timeout: 10_000 });
      await expect(clientPage.getByText(messageAdmin)).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminContext.close();
      await clientContext.close();
    }
  });
});
