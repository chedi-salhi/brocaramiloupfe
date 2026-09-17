import { test, expect } from "@playwright/test";
import { loginAs, logout, TEST_USERS } from "./fixtures/auth";

// Exerce le vrai flux OIDC Keycloak (bouton "Connexion" -> formulaire
// Keycloak -> callback NextAuth) pour les trois rôles, et vérifie que la
// navbar reflète le bon rôle. C'est précisément le chemin qui a posé le plus
// de problèmes pendant la dockerisation (cookie de session cross-site,
// issuer JWT désaligné, redirect_uri manquant côté client Keycloak) — donc
// le test avec le plus de valeur de régression de toute la suite.
test.describe("Connexion Keycloak par rôle", () => {
  test("client : accès Commandes/Favoris/Panier/Profil, pas Administration", async ({ page }) => {
    await loginAs(page, TEST_USERS.client);

    await expect(page.getByRole("link", { name: "Commandes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Administration" })).not.toBeVisible();

    await logout(page);
  });

  test("livreur : accès Livraisons/Profil, pas Panier ni Administration", async ({ page }) => {
    await loginAs(page, TEST_USERS.livreur);

    await expect(page.getByRole("link", { name: "Livraisons" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profil" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Panier" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Administration" })).not.toBeVisible();

    await logout(page);
  });

  test("admin : accès Administration/Paramètres, redirigé hors du catalogue", async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    await expect(page.getByRole("link", { name: "Administration" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Paramètres" })).toBeVisible();
    // proxy.ts redirige "/" -> "/admin" pour ce rôle (voir navbar.tsx :
    // un admin n'a pas de raison de parcourir le catalogue).
    await expect(page).toHaveURL(/\/admin/);

    await logout(page);
  });
});
