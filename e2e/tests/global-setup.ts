import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TEST_USERS } from "./fixtures/auth";

// Le catalogue produits n'est JAMAIS seedé par les migrations Prisma (voir
// backend/prisma/seed.ts, qui ne crée que les rôles) — sur une base fraîche
// (docker-compose.ci.yml en pipeline, "down -v" à chaque run), il n'y a donc
// aucun produit et TOUTE la suite échoue dès le premier "ajouter au panier"
// (aucune carte produit à cliquer). En local ça passait inaperçu parce que
// la base de dev accumule des produits ajoutés à la main depuis des mois.
//
// Ce setup crée le strict nécessaire (1 catégorie + 2 produits en stock) via
// de vrais appels à l'API admin (pas d'insertion SQL directe : évite de
// deviner/dupliquer les règles métier de ProductsService, comme le lien
// avec l'Utilisateur créateur). Idempotent : si le catalogue existe déjà
// (run local répété sur une base persistante), ne fait rien.
const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://keycloak:8080";
const API_URL = process.env.API_URL ?? "http://backend:3001";
const REALM = "brocaramilou";
const CLIENT_ID = "backend";

// Jamais de secret codé en dur ici, même une valeur jetable de CI (SonarCloud
// signale à raison tout littéral qui ressemble à un identifiant/secret) :
// - En CI, la variable d'env KEYCLOAK_CLIENT_SECRET est positionnée par
//   ci.yml, dérivée à l'exécution de keycloak/ci-realm-export.json (déjà
//   committé, valeur jetable documentée là-bas).
// - En local, aucune variable d'env à positionner à la main : on relit
//   directement backend/.env (gitignoré, jamais commité, donc jamais vu par
//   Sonar) — le vrai secret du realm de dev.
function resolveClientSecret(): string {
  if (process.env.KEYCLOAK_CLIENT_SECRET) {
    return process.env.KEYCLOAK_CLIENT_SECRET;
  }
  try {
    const envContent = readFileSync(join(__dirname, "..", "..", "backend", ".env"), "utf-8");
    const match = envContent.match(/^KEYCLOAK_CLIENT_SECRET\s*=\s*"?([^"\r\n]+)"?/m);
    if (match) {
      return match[1];
    }
  } catch {
    // backend/.env absent (checkout frais sans setup local) — traité par
    // l'erreur ci-dessous, avec un message qui dit quoi faire dans les deux cas.
  }
  throw new Error(
    "[global-setup] KEYCLOAK_CLIENT_SECRET introuvable : positionne la variable d'environnement (CI, voir .github/workflows/ci.yml) ou vérifie que backend/.env existe (local, voir RECOVERY.md).",
  );
}

const CATEGORIE_NOM = "E2E";
const PRODUITS = [
  {
    nom: "Miel de romarin (E2E)",
    description: "Miel artisanal — donnée de test créée par global-setup.ts.",
    prix: 25,
    stock: 50,
  },
  {
    nom: "Confiture de figues (E2E)",
    description: "Confiture maison — donnée de test créée par global-setup.ts.",
    prix: 12,
    stock: 50,
  },
];

// Petite marge de retry : le job CI attend déjà que frontend/Keycloak
// répondent avant de lancer "npm test", mais rien ne garantit explicitement
// que le backend ait fini "prisma migrate deploy" à cet instant précis.
async function getAdminToken(): Promise<string> {
  const clientSecret = resolveClientSecret();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: CLIENT_ID,
          client_secret: clientSecret,
          username: TEST_USERS.admin.email,
          password: TEST_USERS.admin.password,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string };
        return data.access_token;
      }
      lastError = new Error(`Keycloak a répondu ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `[global-setup] Impossible d'obtenir un token admin après 10 tentatives : ${String(lastError)}`,
  );
}

export default async function globalSetup() {
  const token = await getAdminToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const existingProducts = (await (await fetch(`${API_URL}/products`)).json()) as unknown[];
  if (Array.isArray(existingProducts) && existingProducts.length > 0) {
    return;
  }

  const categories = (await (await fetch(`${API_URL}/categories`)).json()) as Array<{
    idCategorie: number;
    nom: string;
  }>;
  let categorieId = categories.find((c) => c.nom === CATEGORIE_NOM)?.idCategorie;

  if (!categorieId) {
    const created = await fetch(`${API_URL}/categories`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nom: CATEGORIE_NOM }),
    });
    if (!created.ok) {
      throw new Error(`[global-setup] Échec création catégorie (${created.status})`);
    }
    categorieId = ((await created.json()) as { idCategorie: number }).idCategorie;
  }

  for (const produit of PRODUITS) {
    const created = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...produit, categorieId, isAvailable: true }),
    });
    if (!created.ok) {
      throw new Error(
        `[global-setup] Échec création produit "${produit.nom}" (${created.status})`,
      );
    }
  }
}
