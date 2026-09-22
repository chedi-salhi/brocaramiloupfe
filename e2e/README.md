# Tests E2E (Playwright)

Tests de bout en bout contre la vraie stack Docker (db + Keycloak + backend +
frontend), sans mock — y compris le vrai flux de connexion Keycloak. Voir
`tests/fixtures/auth.ts` pour les comptes de test utilisés.

## Lancer en local

Prérequis : `127.0.0.1 keycloak` et `127.0.0.1 backend` dans le fichier hosts
(voir `../RECOVERY.md`).

```bash
# Stack de dev habituelle (secrets locaux, keycloak/realm-export.json)
docker compose -f ../docker-compose.yml up -d --build

cd e2e
npm install
npx playwright install --with-deps chromium
npm test
```

Rapport HTML après un run : `npm run report`.

## Lancer contre la stack CI (sans les secrets de dev)

```bash
docker compose -f ../docker-compose.ci.yml up -d --build
cd e2e && npm install && npx playwright install --with-deps chromium
BASE_URL=http://keycloak:3000 npm test
docker compose -f ../docker-compose.ci.yml down -v
```

## Pourquoi ces scénarios

- `login.spec.ts` — le flux OIDC Keycloak par rôle (client/livreur/admin) :
  celui qui a posé le plus de problèmes pendant la dockerisation (cookie
  cross-site, issuer, redirect_uri), donc le plus rentable à couvrir.
- `visitor-cart-favorites.spec.ts` — panier/favoris visiteur anonyme
  (session token, pas de compte).
- `checkout.spec.ts` — passage de commande côté client.
- `livreur-payment-rule.spec.ts` / `admin-orders.spec.ts` — la règle
  "livrée seulement après paiement confirmé" (cash vs en ligne), vue depuis
  le livreur et depuis l'admin.

## Limites connues

- Pas de nettoyage automatique des commandes créées par les tests — chaque
  run local en ajoute de nouvelles en base. Sans impact sur la fiabilité des
  tests (chaque commande est ciblée par son id via `data-testid`), juste un
  peu de données de démo qui s'accumulent. En CI, la base repart de zéro à
  chaque run (volume Docker éphémère).
- Le paiement en ligne (PayPal) n'est testé que jusqu'à la création de la
  commande : aucun scénario ne va jusqu'au bout d'un vrai checkout PayPal
  (site externe, pas automatisable de façon stable). Voir
  `tests/fixtures/orders.ts` pour le détail, et `../RECOVERY.md` section
  "Paiement en ligne" pour le flux complet.
