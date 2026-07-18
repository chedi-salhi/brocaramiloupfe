"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import type { Panier } from "@/lib/types";
import { CartItemRow } from "@/components/cart-item-row";
import { CheckoutForm } from "@/components/checkout-form";
import { Button } from "@/components/ui/button";

// Route volontairement HORS de /client (qui exige le rôle "client" via
// proxy.ts) : le panier doit rester consultable par un visiteur anonyme,
// identifié par x-session-token (voir hooks/use-api.ts et FavoritesProvider
// pour le même principe côté favoris). apiFetch (Server Component) ne peut
// pas lire ce token — il vit en localStorage, donc côté client uniquement —
// d'où ce composant "use client" plutôt qu'un fetch serveur.
export default function PanierPage() {
  const { data: session, status } = useSession();
  const roles = session?.roles ?? [];
  const isClient = roles.includes("client");
  const api = useApi();
  const [panier, setPanier] = useState<Panier | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api<Panier>("/cart")
      .then(setPanier)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }

  useEffect(() => {
    if (status === "loading") return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // CartItemRow (quantité/suppression) déclenche cet event plutôt qu'un
  // router.refresh() qui ne ferait rien sur une page déjà 100% client.
  useEffect(() => {
    window.addEventListener("cart-updated", refresh);
    return () => window.removeEventListener("cart-updated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!panier) {
    return <p className="text-foreground/60">Chargement...</p>;
  }

  const total = panier.produits.reduce(
    (sum, item) => sum + Number(item.prixUnitaire) * item.quantite,
    0,
  );

  return (
    <div className="animate-fade-in max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-4">Mon panier</h1>

      {panier.produits.length === 0 ? (
        <p className="text-foreground/60">Ton panier est vide.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 stagger">
            {panier.produits.map((item) => (
              <CartItemRow key={item.idPanierProduit} item={item} />
            ))}
          </div>

          <div className="flex justify-between items-center mt-6 border-t border-border pt-4">
            <span className="font-semibold text-lg">
              Total : <span className="text-brand">{total.toFixed(2)} DT</span>
            </span>
          </div>

          {status === "authenticated" && isClient && <CheckoutForm />}

          {status === "authenticated" && !isClient && (
            <p className="mt-6 border-t border-border pt-6 text-sm text-foreground/60">
              Les commandes sont réservées aux comptes client.
            </p>
          )}

          {status !== "authenticated" && (
            <div className="mt-6 border-t border-border pt-6 flex flex-col gap-3 max-w-sm">
              <p className="text-sm text-foreground/60">
                Connecte-toi ou crée un compte pour valider ta commande — ton panier reste
                intact, il sera automatiquement récupéré.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => signIn("keycloak")}>Se connecter</Button>
                <Link href="/inscription">
                  <Button variant="outline">Créer un compte</Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
