"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import type { Panier } from "@/lib/types";

// Badge orange sur le lien "Panier" (nombre total d'articles, comme les gros
// sites e-commerce). Marche pour visiteur ET client (même API /cart que le
// reste). Se recale via l'event "cart-updated", déclenché par
// AddToCartButton / CartItemRow après chaque changement.
export function CartBadge() {
  const api = useApi();
  const [count, setCount] = useState(0);

  function refresh() {
    api<Panier>("/cart")
      .then((panier) => setCount(panier.produits.reduce((sum, item) => sum + item.quantite, 0)))
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-2 -right-3 h-4 min-w-4 px-1 rounded-full bg-orange-500 text-white text-[10px] leading-4 text-center font-semibold animate-fade-in-scale">
      {count > 99 ? "99+" : count}
    </span>
  );
}
