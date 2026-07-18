"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { Commande } from "@/lib/types";
import { Button } from "@/components/ui/button";

// Paiement à la livraison : tant que le livreur (ou l'admin) n'a pas confirmé
// avoir encaissé le cash, le paiement reste PENDING — pas de facture générée,
// et confirmedById (traçabilité : qui a validé, quand) reste vide. Voir
// PaymentsService.confirmCashPayment côté backend, qui génère la facture dès
// la confirmation. Le paiement en ligne suit toujours son propre circuit
// (webhook -> facture automatique), rien à faire ici pour ce cas.
export function PaymentConfirmButton({ commande }: { commande: Commande }) {
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paiement = commande.paiement;
  if (!paiement || paiement.methodePaiement !== "A_LA_LIVRAISON") return null;

  if (paiement.statut === "SUCCESS") {
    return (
      <p className="mt-3 text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
        ✓ Paiement encaissé et confirmé
      </p>
    );
  }

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      await api(`/payments/${commande.idCommande}/confirm-cash`, { method: "PATCH" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la confirmation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <Button variant="outline" onClick={confirm} disabled={loading} className="text-sm">
        {loading ? "..." : "💵 Confirmer le paiement reçu (cash)"}
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
