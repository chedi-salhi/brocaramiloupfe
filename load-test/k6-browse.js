// Test de charge basique — "Étude Expérimentale" du cahier des charges
// ("Tests de charge : concurrence utilisateur, base de données").
//
// Simule des visiteurs qui parcourent le catalogue en simultané : liste des
// catégories, liste des produits, recherche (LIKE insensible à la casse côté
// Postgres via Prisma), puis consultation d'une fiche produit — le parcours
// public le plus fréquent du site, sans authentification.
//
// Exécution (aucune installation requise, via l'image Docker officielle) :
//
//   docker run --rm -e BASE_URL=http://host.docker.internal:3001 \
//     -v "${PWD}/load-test:/scripts" grafana/k6 run /scripts/k6-browse.js
//
// "host.docker.internal" : le backend écoute sur le port 3001 publié par
// docker-compose (voir RECOVERY.md) ; ce nom permet au conteneur k6
// d'atteindre l'hôte Windows sans rejoindre le réseau Docker du projet.
// Lancer "docker compose up -d" avant, sinon toutes les requêtes échouent.

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

// Termes de recherche réalistes tirés du catalogue de démo (voir
// e2e/tests/global-setup.ts) — variés pour éviter que Postgres ne réponde
// uniquement depuis son cache de plan de requête.
const SEARCH_TERMS = ['', 'chaise', 'table', 'lampe', 'bureau'];

export const options = {
  scenarios: {
    visiteurs: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 }, // montée en charge
        { duration: '40s', target: 20 }, // plateau : 20 visiteurs simultanés
        { duration: '10s', target: 0 },  // redescente
      ],
    },
  },
  thresholds: {
    // Sous ces seuils, le test échoue (exit code non-zéro) — pratique pour
    // un futur job CI dédié, pas seulement une exécution manuelle.
    http_req_failed: ['rate<0.01'],   // moins de 1% d'erreurs
    http_req_duration: ['p(95)<800'], // 95% des requêtes sous 800ms
  },
};

export default function () {
  // 1. Page d'accueil : catégories + produits en parallèle, comme le fait
  //    vraiment le frontend Next.js au chargement de "/".
  const categoriesRes = http.get(`${BASE_URL}/categories`, { tags: { name: 'categories' } });
  const produitsRes = http.get(`${BASE_URL}/products`, { tags: { name: 'products' } });

  check(categoriesRes, { 'categories: 200': (r) => r.status === 200 });
  check(produitsRes, { 'products: 200': (r) => r.status === 200 });

  sleep(1);

  // 2. Recherche dans le catalogue (déclenche une requête Postgres avec
  //    ILIKE + jointure catégorie — voir products.service.ts).
  const terme = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const searchRes = http.get(`${BASE_URL}/products?search=${encodeURIComponent(terme)}`, {
    tags: { name: 'products_search' },
  });
  check(searchRes, { 'search: 200': (r) => r.status === 200 });

  sleep(1);

  // 3. Fiche produit : prend un produit au hasard dans la réponse précédente
  //    pour simuler un clic réel plutôt qu'un ID fixe.
  try {
    const produits = produitsRes.json();
    if (Array.isArray(produits) && produits.length > 0) {
      const produit = produits[Math.floor(Math.random() * produits.length)];
      const detailRes = http.get(`${BASE_URL}/products/${produit.idProduit}`, {
        tags: { name: 'product_detail' },
      });
      check(detailRes, { 'product detail: 200': (r) => r.status === 200 });
    }
  } catch {
    // Réponse vide/inattendue (ex. catalogue non seedé) : on ignore cette
    // étape plutôt que de faire planter tout le VU.
  }

  sleep(2);
}
