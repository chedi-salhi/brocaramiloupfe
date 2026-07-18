import { apiFetch } from "@/lib/api-client";
import type { Categorie, Commande, Produit } from "@/lib/types";
import { InventoryAdmin } from "@/components/admin/inventory-admin";

// Aucune route/champ backend nouveau : tout est recalculé côté client à partir
// de GET /products (stock actuel) et GET /orders (historique des ventes),
// exactement comme le dashboard livreur — pas de changement de schéma.
export default async function AdminInventairePage() {
  const [produits, categories, commandes] = await Promise.all([
    apiFetch<Produit[]>("/products"),
    apiFetch<Categorie[]>("/categories"),
    apiFetch<Commande[]>("/orders"),
  ]);

  return <InventoryAdmin produits={produits} categories={categories} commandes={commandes} />;
}
