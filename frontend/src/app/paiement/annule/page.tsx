"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

// cancel_url passée par PaymentsService.initiateOnlinePayment : PayPal
// redirige ici si le client annule avant d'approuver. La commande existe
// toujours, paiement resté PENDING — le stock et le panier n'ont jamais été
// touchés (voir OrdersService.create) — deux issues possibles : soit
// réessayer le même paiement, soit annuler franchement (POST
// /orders/:id/cancel marque juste la commande Annulée, sans rien à
// restaurer puisque rien n'a été consommé, voir OrdersService.cancel). Pas
// de "Voir ma commande" : une commande jamais payée ne doit pas être
// présentée comme normale.
function PaiementAnnuleContent() {
  const params = useSearchParams();
  const router = useRouter();
  const commandeId = params.get("commandeId");
  const api = useApi();
  // Comme /paiement/retour : PayPal ramène ici via un rechargement complet
  // de la page, donc useSession() peut encore être "loading" au moment où
  // le client clique s'il est rapide — désactiver les boutons jusque-là
  // évite un 401 "Token manquant" (session pas encore hydratée côté
  // client, voir useApi qui basculerait sinon sur le jeton visiteur).
  const { status: sessionStatus } = useSession();
  const sessionReady = sessionStatus !== "loading";
  const [loading, setLoading] = useState<"retry" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  async function retry() {
    if (!commandeId) return;
    setLoading("retry");
    setError(null);
    try {
      const { approvalUrl } = await api<{ approvalUrl: string }>(
        `/payments/${commandeId}/initiate`,
        { method: "POST" },
      );
      window.location.href = approvalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la relance du paiement");
      setLoading(null);
    }
  }

  async function cancelOrder() {
    if (!commandeId) return;
    setLoading("cancel");
    setError(null);
    try {
      await api(`/orders/${commandeId}/cancel`, { method: "PATCH" });
      setCancelled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'annulation");
      setLoading(null);
    }
  }

  if (cancelled) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center animate-fade-in">
        <p className="text-2xl mb-2">✓</p>
        <h1 className="text-lg font-semibold mb-2">Commande annulée</h1>
        <p className="text-sm text-foreground/60 mb-6">
          Tes articles sont toujours dans ton panier.
        </p>
        <Button onClick={() => router.push("/panier")}>Voir mon panier</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center animate-fade-in">
      <h1 className="text-lg font-semibold mb-2">Paiement annulé</h1>
      <p className="text-sm text-foreground/60 mb-6">
        Ta commande n&apos;a pas encore été confirmée — tu peux réessayer le paiement, ou
        l&apos;annuler (tes articles sont toujours dans ton panier, rien n&apos;a été débité ni
        réservé).
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex gap-3 justify-center">
        {commandeId && (
          <Button onClick={retry} disabled={loading !== null || !sessionReady}>
            {loading === "retry" ? "..." : "Réessayer le paiement"}
          </Button>
        )}
        {commandeId && (
          <Button
            variant="outline"
            onClick={cancelOrder}
            disabled={loading !== null || !sessionReady}
          >
            {loading === "cancel" ? "..." : "Annuler la commande"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PaiementAnnulePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-6 py-16 text-center text-foreground/60">
          Chargement...
        </div>
      }
    >
      <PaiementAnnuleContent />
    </Suspense>
  );
}
