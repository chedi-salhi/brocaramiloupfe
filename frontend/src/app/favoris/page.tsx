"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import type { Produit } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { FavoritesProvider } from "@/components/favorites-provider";

interface Favori {
  idFavori: number;
  produit: Produit;
}

// Route volontairement HORS de /client (comme /panier, voir son commentaire) :
// les favoris doivent rester consultables par un visiteur anonyme, identifié
// par x-session-token (voir hooks/use-api.ts et FavoritesProvider). apiFetch
// (Server Component) ne peut pas lire ce token — il vit en localStorage, donc
// côté client uniquement — d'où ce composant "use client" plutôt qu'un fetch
// serveur, exactement comme /panier.
export default function FavorisPage() {
  const api = useApi();
  const [favoris, setFavoris] = useState<Favori[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Favori[]>("/favorites")
      .then(setFavoris)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="text-sm text-red-600 max-w-6xl mx-auto px-6 py-10">{error}</p>;
  }

  if (!favoris) {
    return <p className="text-foreground/60 max-w-6xl mx-auto px-6 py-10">Chargement...</p>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
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
