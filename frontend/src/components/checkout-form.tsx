"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { Commande, Utilisateur } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function CheckoutForm() {
  const api = useApi();
  const router = useRouter();
  const [adresse, setAdresse] = useState("");
  const [methode, setMethode] = useState<"A_LA_LIVRAISON" | "EN_LIGNE">("A_LA_LIVRAISON");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplit avec l'adresse enregistrée dans le profil, pour éviter de la
  // retaper à chaque commande (éditable sur /client/profil).
  useEffect(() => {
    api<Utilisateur>("/auth/me")
      .then((moi) => {
        if (moi.adresse) setAdresse(moi.adresse);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const commande = await api<Commande>("/orders", {
        method: "POST",
        body: JSON.stringify({ adresseLivraison: adresse, methodePaiement: methode }),
      });

      if (methode === "EN_LIGNE") {
        // La commande existe mais reste PENDING tant que le paiement PayPal
        // n'est pas capturé (voir PaymentsService.initiateOnlinePayment) —
        // on quitte l'app le temps du checkout PayPal, pas de redirection
        // vers /client/commandes ici.
        const { approvalUrl } = await api<{ approvalUrl: string }>(
          `/payments/${commande.idCommande}/initiate`,
          { method: "POST" },
        );
        window.location.href = approvalUrl;
        return;
      }

      router.push(`/client/commandes/${commande.idCommande}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la commande");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 border-t border-border pt-6 flex flex-col gap-3 max-w-sm animate-fade-in"
    >
      <h2 className="font-medium">Passer la commande</h2>

      <label className="text-sm">
        Adresse de livraison
        <input
          required
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          placeholder="12 rue de la Paix, Tunis"
          data-testid="checkout-address-input"
        />
        <span className="text-xs text-foreground/50">
          Pré-remplie depuis ton profil — modifiable ici ponctuellement.
        </span>
      </label>

      <label className="text-sm">
        Mode de paiement
        <select
          value={methode}
          onChange={(e) => setMethode(e.target.value as typeof methode)}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          data-testid="checkout-method-select"
        >
          <option value="A_LA_LIVRAISON">À la livraison</option>
          <option value="EN_LIGNE">En ligne</option>
        </select>
      </label>

      {error && <p className="text-sm text-red-600 animate-fade-in">{error}</p>}

      <Button disabled={loading} className="mt-2">
        {loading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
        {loading ? "Envoi..." : "Confirmer la commande"}
      </Button>
    </form>
  );
}
