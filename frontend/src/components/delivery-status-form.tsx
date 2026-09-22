"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { Commande, EtatCommande } from "@/lib/types";
import { Button } from "@/components/ui/button";

const NEXT_STATES: Record<EtatCommande, EtatCommande | null> = {
  EN_ATTENTE: "EN_LIVRAISON",
  EN_LIVRAISON: "LIVREE",
  LIVREE: null,
  ANNULEE: null,
};

const LABELS: Record<string, string> = {
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
};

export function DeliveryStatusForm({
  commandeId,
  etatActuel,
  paiement,
}: {
  commandeId: number;
  etatActuel: EtatCommande;
  paiement?: Commande["paiement"];
}) {
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_STATES[etatActuel];

  if (!next) return null;

  // Paiement en ligne : déjà encaissé, rien à bloquer. Paiement à la
  // livraison : il faut d'abord confirmer le cash reçu (voir
  // PaymentConfirmButton) avant de pouvoir marquer la commande livrée —
  // même règle appliquée côté backend (OrdersService.updateStatus), ici
  // juste pour éviter un clic qui échouerait avec une erreur 400.
  const cashNonConfirme =
    next === "LIVREE" && paiement?.methodePaiement === "A_LA_LIVRAISON" && paiement.statut !== "SUCCESS";

  async function advance() {
    setLoading(true);
    setError(null);
    try {
      await api(`/orders/${commandeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ etat: next }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (cashNonConfirme) {
    return (
      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400" data-testid="cash-not-confirmed-warning">
        Confirme le paiement cash reçu ci-dessous avant de pouvoir marquer la commande livrée.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <Button onClick={advance} disabled={loading} data-testid="delivery-status-advance-button">
        {loading ? "..." : `Marquer « ${LABELS[next]} »`}
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
