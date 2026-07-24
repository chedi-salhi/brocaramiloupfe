import { defineConfig, devices } from "@playwright/test";

// http://keycloak:3000 = URL réelle du mode tout-Docker (voir RECOVERY.md,
// piège "cookie cross-site login" : Keycloak refuse son cookie de session
// sur une requête POST cross-site en HTTP non chiffré, donc navigateur et
// Keycloak doivent partager le même hôte). Nécessite l'entrée "127.0.0.1
// keycloak" dans le fichier hosts de la machine qui exécute les tests — en
// local comme en CI (voir le job "e2e" de ci.yml qui l'ajoute lui-même).
const BASE_URL = process.env.BASE_URL ?? "http://keycloak:3000";

export default defineConfig({
  testDir: "./tests",
  // Crée le catalogue produits minimal requis par la suite si la base est
  // vierge (voir global-setup.ts) — sans ça, tout scénario qui commence par
  // "ajouter un produit au panier" échoue au timeout sur une base fraîche.
  globalSetup: "./tests/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  // Les scénarios réutilisent les mêmes comptes de test (panier, commandes,
  // statuts de livraison) — les lancer en parallèle créerait des
  // interférences entre specs plutôt que des faux positifs isolés faciles à
  // diagnostiquer. Le gain de vitesse du parallélisme ne vaut pas ça pour
  // une suite de cette taille.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // Toujours générer le rapport HTML (utilisable via "npm run report"), pas
  // seulement en CI — "list" en plus pour le retour console pendant le run.
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
