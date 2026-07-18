"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { EtatCommande } from "@/lib/types";
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
}: {
  commandeId: number;
  etatActuel: EtatCommande;
}) {
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = NEXT_STATES[etatActuel];

  if (!next) return null;

  async function advance() {
    setLoading(true);
    try {
      await api(`/orders/${commandeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ etat: next }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={advance} disabled={loading} className="mt-3">
      {loading ? "..." : `Marquer « ${LABELS[next]} »`}
    </Button>
  );
}
