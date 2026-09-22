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
  // Un logout() qui vient de tourner peut laisser le round-trip de
  // déconnexion Keycloak encore en vol (voir logout() ci-dessous) : ce
  // goto("/") entre alors en course avec cette navigation et échoue avec
  // net::ERR_ABORTED. Un seul retry suffit — la première tentative laisse
  // le temps à la navigation en vol de se terminer, la seconde part d'un
  // état stable. Plus robuste qu'essayer de deviner/attendre une URL
  // intermédiaire précise pendant le logout (testé, voir historique git :
  // ça a cassé plus de tests que ça n'en a réparé).
  try {
    await page.goto("/");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("ERR_ABORTED")) throw err;
    await page.goto("/");
  }

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

  // fullSignOut() (lib/full-sign-out.ts) fait d'abord signOut({redirect:
  // false}) — qui bascule l'UI en "Connexion" quasi instantanément côté
  // client — PUIS seulement window.location.href vers l'endpoint de logout
  // Keycloak (vrai aller-retour SSO qui revient sur post_logout_redirect_uri
  // = "/"). Si on rend la main dès que "Connexion" est visible, ce
  // round-trip est encore en vol : le prochain loginAs() (plusieurs specs
  // enchaînent client → admin → livreur dans le même test) entre en course
  // avec cette navigation et échoue avec net::ERR_ABORTED. On absorbe donc
  // le round-trip avant de continuer.
  //
  // Tentative précédente : attendre explicitement le passage par l'URL de
  // logout Keycloak (/realms/.../protocol/openid-connect/logout) avant ce
  // waitForURL("/"). Ça a empiré les choses en CI (9 échecs au lieu de 4) :
  // le redirect Keycloak -> "/" est apparemment trop rapide/cross-origin
  // pour que Playwright l'observe comme une navigation distincte, donc
  // cette attente timeout systématiquement. Le waitForURL("/") seul reste
  // imparfait (résout immédiatement si l'URL courante est déjà "/", cas de
  // createOrderAsClient() en EN_LIGNE) mais c'est loginAs() qui absorbe ce
  // reliquat avec un retry sur ERR_ABORTED plutôt que logout() lui-même.
  //
  // 15s -> 30s (22/09/2026) : vu en CI un logout depuis /admin/commandes
  // rester bloqué sur /admin (garde de route côté client qui réagit à la
  // perte de session) avant d'atteindre "/", et dépasser 15s — cohérent
  // avec la stack CI mesurée plus lente qu'en local sur cette session
  // (voir aussi messaging.spec.ts, même symptôme/même fix).
  await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Connexion" })).toBeVisible({ timeout: 15_000 });
}
