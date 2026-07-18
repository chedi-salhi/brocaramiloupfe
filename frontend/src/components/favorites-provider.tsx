"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";

interface Favori {
  produitId: number;
}

interface FavoritesContextValue {
  isFavorite: (produitId: number) => boolean;
  toggle: (produitId: number) => Promise<void>;
  ready: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

// Un seul fetch de /favorites pour toute la grille du catalogue (pas un par
// carte produit) : le contexte porte l'ensemble des produitId favoris, chaque
// FavoriteButton ne fait qu'y lire/écrire. Marche pour visiteur (x-session-token,
// géré automatiquement par useApi) et client connecté, comme le panier.
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<Favori[]>("/favorites")
      .then((favoris) => setIds(new Set(favoris.map((f) => f.produitId))))
      .catch(() => {})
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(produitId: number) {
    const wasFavorite = ids.has(produitId);

    // Optimiste : on met à jour l'UI tout de suite, on corrige si l'appel échoue.
    setIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(produitId);
      else next.add(produitId);
      return next;
    });

    try {
      if (wasFavorite) {
        await api(`/favorites/${produitId}`, { method: "DELETE" });
      } else {
        await api(`/favorites/${produitId}`, { method: "POST" });
      }
    } catch (err) {
      // 409 = déjà favori côté serveur (double-clic rapide) : l'état affiché
      // (favorited) était déjà correct, pas de rollback dans ce cas précis.
      const alreadyFavorite = err instanceof Error && err.message.includes("409");
      if (alreadyFavorite) return;

      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(produitId);
        else next.delete(produitId);
        return next;
      });
    }
  }

  return (
    <FavoritesContext.Provider value={{ isFavorite: (id) => ids.has(id), toggle, ready }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites doit être utilisé sous <FavoritesProvider>");
  }
  return ctx;
}
