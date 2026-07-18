import { apiFetch } from "@/lib/api-client";
import type { Produit } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { FavoritesProvider } from "@/components/favorites-provider";

interface Favori {
  idFavori: number;
  produit: Produit;
}

export default async function FavorisPage() {
  const favoris = await apiFetch<Favori[]>("/favorites");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Mes favoris</h1>

      {favoris.length === 0 ? (
        <p className="text-foreground/60">Aucun favori pour le moment.</p>
      ) : (
        // Même carte produit que le catalogue (image, prix, stock, cœur,
        // "Ajouter au panier") plutôt qu'un résumé texte minimal — le cœur
        // permet aussi de retirer directement un favori depuis cette page.
        <FavoritesProvider>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 stagger">
            {favoris.map((favori) => (
              <ProductCard key={favori.idFavori} produit={favori.produit} />
            ))}
          </div>
        </FavoritesProvider>
      )}
    </div>
  );
}
