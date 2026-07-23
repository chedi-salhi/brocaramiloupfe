import { Page, expect } from "@playwright/test";

// Comptes de test définis dans RECOVERY.md, recréés par
// recreate-keycloak-users.ps1 en local, ou par le realm de fixture CI
// (keycloak/ci-realm-export.json) en pipeline — mêmes emails/mot de passe
// dans les deux cas pour que la suite tourne à l'identique partout.
export const TEST_USERS = {
  admin: { email: "testadmin@example.com", password: "Changer123!" },
  client: { email: "salhi08fares@gmail.com", password: "Changer123!" },
  livreur: { email: "mohemedhedi@gmail.com", password: "Changer123!" },
} as const;

export type TestUser = (typeof TEST_USERS)[keyof typeof TEST_USERS];

// Connexion via le vrai flux OIDC Keycloak — aucun mock d'auth. C'est
// volontaire : le login est exactement le flux qu'on a passé le plus de
// temps à déboguer manuellement pendant la dockerisation (cookie
// cross-site, issuer, redirect_uri...), donc le test le plus rentable de
// toute la suite est celui qui l'exerce pour de vrai à chaque run.
export async function loginAs(page: Page, user: TestUser) {
  await page.goto("/");
  await page.getByRole("button", { name: "Connexion" }).click();

  // Keycloak sert son propre formulaire HTML (pas de composant React) —
  // attendre l'URL plutôt qu'un sélecteur évite une course avec la
  // redirection OIDC (auth -> login -> callback).
  await page.waitForURL(/\/realms\/[^/]+\/protocol\/openid-connect\/auth/);

  await page.locator("#username").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.locator("#kc-login").click();

  // Retour sur l'app : la navbar affiche "Déconnexion" une fois la session
  // NextAuth établie côté client (le callback OIDC peut prendre un instant).
  await expect(page.getByRole("button", { name: "Déconnexion" })).toBeVisible({
    timeout: 15_000,
  });
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page.getByRole("button", { name: "Connexion" })).toBeVisible({ timeout: 15_000 });
}
