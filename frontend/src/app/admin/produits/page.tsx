import { apiFetch } from "@/lib/api-client";
import type { Categorie, Produit } from "@/lib/types";
import { ProductsAdmin } from "@/components/admin/products-admin";
import { CategoriesPanel } from "@/components/admin/categories-panel";

export default async function AdminProduitsPage() {
  const [produits, categories] = await Promise.all([
    apiFetch<Produit[]>("/products"),
    apiFetch<Categorie[]>("/categories"),
  ]);

  return (
    <div>
      <CategoriesPanel categories={categories} />
      <ProductsAdmin produits={produits} categories={categories} />
    </div>
  );
}
