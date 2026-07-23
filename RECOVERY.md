# Récupération après incident (Docker / Keycloak / Postgres)

Ce fichier documente comment relancer l'environnement de dev depuis zéro,
suite à l'incident du 19-20/07/2026 (perte du realm Keycloak et découverte
d'un Postgres natif orphelin sur le port 5434). Depuis, tout l'état (realm
Keycloak + base de données) vit dans Docker et est reproductible. Depuis le
20/07/2026, `backend` et `frontend` sont eux aussi dockerisés — les 4
services tournent ensemble via `docker compose up`.

## Démarrage normal (tout-Docker)

**Prérequis unique, une seule fois par machine** : voir "Fichier hosts
Windows" ci-dessous — sans ça, le login Keycloak et les appels API depuis le
navigateur échouent alors que tout semble démarrer correctement côté serveur.

```
docker compose up -d --build
```

(`--build` nécessaire seulement au premier démarrage ou après une
modification du code — voir "Après une modification du code" plus bas ;
sinon `docker compose up -d` suffit.)

Démarre les 4 services :
- `db` (Postgres, port **5433**)
- `keycloak` (port **8080**) — realm `brocaramilou` importé automatiquement
  depuis `keycloak/realm-export.json` s'il n'existe pas déjà (voir
  `docker-compose.yml`, option `--import-realm`)
- `backend` (port **3001**) — applique les migrations Prisma au démarrage
  (`prisma migrate deploy`)
- `frontend` (port **3000**)

**Le site s'ouvre à `http://keycloak:3000`** (pas `localhost:3000` ni
`127.0.0.1:3000` — voir le piège cookie cross-site plus bas).

## Après une modification du code (frontend ou backend)

Les images Docker sont construites une fois ; elles ne voient pas les
changements de fichiers tant qu'elles ne sont pas reconstruites. Après avoir
édité du code :

```
docker compose build --no-cache frontend   # ou backend, ou les deux
docker compose up -d frontend
```

Si le changement n'apparaît toujours pas dans le navigateur après ça, c'est
en général le cache du navigateur — recharger en navigation privée ou avec
Ctrl+Shift+R avant de creuser plus loin côté Docker.

## Mode développement natif (alternatif, sans Docker pour backend/frontend)

Utile pour itérer plus vite (hot-reload) sans reconstruire d'image à chaque
changement :

```
docker compose up -d db keycloak
```

Puis, dans deux terminaux séparés :

```
cd backend && npm run start:dev
cd frontend && npm run dev
```

Dans ce mode, le site est accessible sur `http://127.0.0.1:3000` (pas
`http://keycloak:3000`, réservé au mode tout-Docker).

## Si le realm Keycloak ou la base sont perdus (`docker compose down -v`, volume corrompu, etc.)

1. `docker compose up -d` — recrée `db` vide et réimporte automatiquement le
   realm/clients/rôles depuis `keycloak/realm-export.json`.
2. `.\recreate-keycloak-users.ps1` — recrée les 5 comptes utilisateurs
   (mot de passe temporaire commun : `Changer123!`) et génère
   `relink-users.sql`.
3. `psql "postgresql://brocaramilou:brocaramilou@127.0.0.1:5433/brocaramilou" -f relink-users.sql`
   — relie chaque compte Keycloak recréé à sa ligne Postgres existante
   (conserve commandes/favoris/produits).
4. Si la base elle-même est vide (pas seulement Keycloak), il faut d'abord
   restaurer un dump Postgres avant l'étape 3 — voir section suivante.

## Sauvegarder / restaurer la base Postgres

```
# Dump
$env:PGPASSWORD="brocaramilou"
pg_dump -h 127.0.0.1 -p 5433 -U brocaramilou -d brocaramilou -F p -f pg-backup.sql

# Restauration dans un conteneur fraîchement démarré
Get-Content pg-backup.sql | docker exec -i brocaramiloupfe-db-1 psql -U brocaramilou -d brocaramilou
```

## Après toute modification du realm Keycloak (nouveau client, rôle, etc.)

Réexporter pour que `keycloak/realm-export.json` reste à jour, sinon un futur
`docker compose up` après perte du volume recréerait un realm obsolète :

```
.\export-keycloak-realm.ps1
```

## Paiement en ligne (PayPal Sandbox)

Depuis le 21/07/2026, le paiement en ligne (`EN_LIGNE`) utilise une vraie
intégration PayPal Sandbox (`backend/src/payments/paypal-client.service.ts`)
plutôt qu'un mock local — remplace l'ancienne tentative avec Flouci,
bloquée par les démarches d'ouverture de compte marchand.

- Identifiants dans `backend/.env` (`PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET`) — un compte développeur PayPal gratuit
  (developer.paypal.com), aucune vérification bancaire nécessaire pour la
  sandbox.
- PayPal ne supporte pas le Dinar tunisien : conversion approximative via
  `PAYPAL_TND_TO_USD_RATE` (taux fixe, pas d'API de change) uniquement pour
  l'appel PayPal — le montant facturé/affiché au client reste toujours en
  TND.
- Flux : `CheckoutForm` crée la commande (`POST /orders`, paiement `PENDING`)
  puis redirige immédiatement vers PayPal (`POST /payments/:id/initiate`).
  Au retour, `/paiement/retour` capture réellement le paiement (`POST
  /payments/:id/capture`) — c'est cette étape, pas l'approbation côté
  PayPal, qui génère la facture et déclenche les emails. `/paiement/annule`
  gère l'abandon avant paiement, avec un bouton pour relancer.
- `FRONTEND_URL` dans `backend/.env` doit pointer vers l'URL réellement
  utilisée par le navigateur (`http://keycloak:3000` en mode tout-Docker)
  puisque le backend construit lui-même les URLs de retour PayPal.
- En CI (`docker-compose.ci.yml`), des identifiants PayPal bidon sont
  utilisés volontairement — aucun scénario Playwright ne va jusqu'au bout
  d'un vrai checkout PayPal (site externe, pas automatisable de façon stable
  en pipeline). Voir `e2e/tests/fixtures/orders.ts`.

### Échec/annulation de paiement : le panier et le stock ne doivent JAMAIS bouger avant un paiement confirmé

Deux corrections successives sur ce point, le 21/07/2026 puis le 22/07/2026.

**Première correction (21/07)** : un paiement PayPal refusé ou abandonné
laissait la commande visible côté admin exactement comme une commande
confirmée (stock décrémenté, panier vidé, assignable à un livreur). Le
correctif initial restaurait stock + panier à l'échec/annulation
(`OrdersService.cancel()` recréait le panier à l'identique). Ça réparait le
symptôme, mais le vrai problème restait : le stock/panier étaient toujours
touchés dès la création de la commande, avant même que le client n'ait payé
quoi que ce soit — donc un client qui abandonnait sans jamais cliquer sur
"Annuler" gardait son panier vide et son stock décrémenté indéfiniment.

**Deuxième correction (22/07, architecture définitive)** : pour `EN_LIGNE`,
stock et panier ne sont plus touchés du tout à la création de la commande —
seulement à la capture PayPal réellement réussie. Concrètement :

- `OrdersService.create()` : pour `A_LA_LIVRAISON`, décrémente le stock et
  vide le panier immédiatement, comme avant (pas d'étape externe à
  attendre). Pour `EN_LIGNE`, ne touche ni à l'un ni à l'autre — la commande
  est créée avec son paiement `PENDING`, un simple snapshot des prix/produits,
  rien de plus.
- `OrdersService.confirmOnlinePaymentSuccess(commandeId)` (nouvelle méthode) :
  appelée uniquement par `PaymentsService.captureOnlinePayment()` quand
  PayPal renvoie `COMPLETED` — c'est SEULEMENT à ce moment-là que le stock
  est décrémenté et que le panier est "consommé" (retire uniquement les
  quantités de la commande, pas tout le panier — le client a pu ajouter
  d'autres articles entre-temps).
- `OrdersService.cancel()` : ne restaure stock/panier QUE s'ils avaient
  réellement été consommés (`A_LA_LIVRAISON`, ou `EN_LIGNE` déjà `SUCCESS`).
  Pour une commande `EN_LIGNE` jamais payée, annuler ne fait que marquer
  `ANNULEE` — il n'y a rien à restaurer puisque rien n'a jamais bougé.
- `PaymentsService.captureOnlinePayment()` : appelle
  `confirmOnlinePaymentSuccess()` sur succès (avant facture/email), et
  `OrdersService.cancel()` sur échec (qui ne fait plus que marquer
  `ANNULEE`, cf. point précédent).
- `OrdersService.assignLivreur()` et `updateStatus()` refusent (400) toute
  action sur une commande `EN_LIGNE` dont le paiement n'est pas `SUCCESS`,
  sauf le passage à `ANNULEE`.
- Frontend : `/paiement/annule` propose "Réessayer le paiement" ou "Annuler
  la commande" (`PATCH /orders/:id/cancel` — un simple marquage `ANNULEE`,
  le panier n'a jamais été vidé donc rien à "restaurer"). Pas de lien "Voir
  ma commande" pour une commande jamais payée.
- Admin (`OrdersAdmin.tsx`) : une commande `EN_LIGNE` non confirmée
  (`paiement.statut !== "SUCCESS"`) n'a pas été validée par le client — elle
  est **masquée par défaut** de la liste (simple bruit, aucun stock/panier
  en jeu tant qu'elle n'est pas payée). Un lien "N paiement(s) en ligne non
  confirmé(s) masqué(s) — afficher" (`data-testid="toggle-unconfirmed-orders"`)
  permet de la révéler ponctuellement, par exemple pour l'annuler
  manuellement si le client a fermé l'onglet PayPal sans jamais revenir.
  Une fois révélée : bannière d'avertissement + `<select>` livreur et
  boutons de statut désactivés (sauf Annulée).
- Couvert par `e2e/tests/livreur-payment-rule.spec.ts` ("une commande en
  ligne non payée ne peut pas être assignée à un livreur") et
  `e2e/tests/admin-orders.spec.ts` ("une commande en ligne non payée ne peut
  être qu'annulée depuis le panneau admin") — les deux vérifient d'abord
  qu'elle est absente de la liste, puis cliquent le toggle pour la révéler.

**Limite connue (hors scope PFE)** : le stock est seulement *vérifié*
(disponibilité) à la création d'une commande `EN_LIGNE`, pas réservé — deux
clients peuvent donc, en théorie, passer commande sur le dernier exemplaire
en même temps et tous deux réussir leur paiement PayPal, menant à un stock
négatif. Corriger ça proprement demanderait un mécanisme de réservation
avec expiration (hors scope pour une démo).

## Fichier hosts Windows (obligatoire en mode tout-Docker)

Le navigateur et les conteneurs doivent résoudre `keycloak` et `backend` vers
la même adresse. Ajouter dans `C:\Windows\System32\drivers\etc\hosts`
(PowerShell en administrateur, jamais Notepad — voir piège BOM plus bas) :

```
127.0.0.1 keycloak
127.0.0.1 backend
```

Vérifier avec `ping keycloak` et `ping backend`. Sans ces entrées : la page
d'accueil se charge (elle ne dépend que du frontend) mais le login Keycloak
et tous les appels API (panier, favoris, etc.) échouent silencieusement côté
navigateur, alors que les logs des conteneurs paraissent normaux.

## Pièges connus

- **Pourquoi `http://keycloak:3000` et pas `127.0.0.1:3000` en mode
  tout-Docker** : Keycloak refuse d'envoyer son cookie de session de
  connexion dans une requête POST cross-site en HTTP non chiffré (log
  Keycloak : `cookies... will not be available in cross-origin POST
  requests`). Le navigateur et Keycloak doivent donc partager le même nom
  d'hôte (`keycloak`), seul le port diffère (3000 vs 8080) — c'est pour ça
  que `NEXTAUTH_URL` vaut `http://keycloak:3000` dans `docker-compose.yml` et
  que `keycloak` doit être ajouté au fichier hosts (voir ci-dessus). Se
  connecter via `127.0.0.1:3000` en mode tout-Docker reproduit ce blocage
  (page de connexion qui reste chargée indéfiniment après soumission).

- **`localhost` vs `127.0.0.1`** : Windows essaie IPv6 (`::1`) en premier sur
  `localhost`, qui n'est souvent pas bindé par les conteneurs Docker — ça
  provoque des blocages/timeouts silencieux (navigateur qui "reload" à
  l'infini, `fetch failed` côté Next.js). Tous les `.env` du projet
  (`backend/.env`, `frontend/.env.local`) et les scripts PowerShell utilisent
  volontairement `127.0.0.1` pour l'hôte Keycloak/Postgres, pas `localhost`.
  Si l'un des deux redevient `localhost` par erreur, remets `127.0.0.1`.

- **Issuer Keycloak cohérent des deux côtés** : `KEYCLOAK_ISSUER` /
  `NEXT_PUBLIC_KEYCLOAK_ISSUER` (frontend) et `KEYCLOAK_URL` (backend)
  doivent pointer vers le **même** host (`127.0.0.1:8080`). Sinon le champ
  `iss` du JWT émis par Keycloak ne correspond plus à l'issuer que le backend
  attend, et les requêtes authentifiées échouent silencieusement (traitées
  comme non connectées plutôt que rejetées avec une erreur claire).

- **Ne plus utiliser le Postgres natif Windows (port 5434)** : le service a
  été arrêté (`Stop-Service postgresql-x64-16`) mais pas désinstallé. Toutes
  les données ont été migrées vers le conteneur Docker (port 5433), qui est
  désormais la seule source de vérité. Ne pas redémarrer ce service pour
  "dépanner" un problème de connexion — ça recréerait exactement la confusion
  qui a causé l'incident.

- **BOM UTF-8 dans les fichiers `.sql` générés par PowerShell** : `Out-File
  -Encoding utf8` ajoute un BOM que `psql` interprète comme une erreur de
  syntaxe sur la première ligne. `recreate-keycloak-users.ps1` écrit
  maintenant en UTF-8 sans BOM (`[System.IO.File]::WriteAllText` avec
  `UTF8Encoding($false)`) — à réutiliser si un autre script génère du SQL.

## Comptes de test

| Email | Rôle | Mot de passe |
|---|---|---|
| testadmin@example.com | admin | Changer123! |
| salhi08fares@gmail.com | client | Changer123! |
| salhichedy2@gmail.com | client | Changer123! |
| chadi5marat@gmail.com | client | Changer123! |
| mohemedhedi@gmail.com | livreur | Changer123! |

(Mots de passe temporaires — à changer depuis le profil une fois soutenance/
démo passée.)
