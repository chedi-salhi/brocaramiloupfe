"use client";

import { useApi } from "@/hooks/use-api";
import type { PanierProduit } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function CartItemRow({ item }: { item: PanierProduit }) {
  const api = useApi();

  // Panier passé en composant client (voir app/panier/page.tsx) : un simple
  // router.refresh() ne rafraîchit rien puisqu'il n'y a plus de fetch serveur
  // à rejouer. On prévient plutôt via un event, écouté par la page panier ET
  // par le badge de la navbar (même mécanisme que "messages-read").
  async function updateQuantite(quantite: number) {
    if (quantite < 1) return;
    await api(`/cart/items/${item.produitId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantite }),
    });
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function remove() {
    await api(`/cart/items/${item.produitId}`, { method: "DELETE" });
    window.dispatchEvent(new Event("cart-updated"));
  }

  return (
    <Card hoverable={false} className="flex items-center justify-between">
      <div>
        <p className="font-medium">{item.produit.nom}</p>
        <p className="text-sm text-foreground/60">
          {item.prixUnitaire} DT / {item.produit.unite}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border">
          <button
            onClick={() => updateQuantite(item.quantite - 1)}
            className="w-8 h-8 rounded-full hover:bg-surface-muted hover:text-brand transition-colors"
          >
            −
          </button>
          <span className="w-6 text-center">{item.quantite}</span>
          <button
            onClick={() => updateQuantite(item.quantite + 1)}
            className="w-8 h-8 rounded-full hover:bg-surface-muted hover:text-brand transition-colors"
          >
            +
          </button>
        </div>
        <button
          onClick={remove}
          className="text-sm text-red-600 hover:text-red-700 hover:underline"
        >
          Retirer
        </button>
      </div>
    </Card>
  );
}
