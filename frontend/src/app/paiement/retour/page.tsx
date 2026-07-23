"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

// Page de retour PayPal (return_url passée par PaymentsService.initiateOnlinePayment) :
// PayPal redirige ici une fois que le client a approuvé le paiement côté
// PayPal, mais RIEN n'est encore capturé à ce stade — c'est cet appel à
// /payments/:id/capture qui encaisse réellement et déclenche la facture
// (voir PaymentsService.captureOnlinePayment). Idempotent côté backend, donc
// un rechargement de cette page ne capture pas deux fois.
function PaiementRetourContent() {
  const params = useSearchParams();
  const commandeId = params.get("commandeId");
  const api = useApi();
  // PayPal redirige vers un rechargement complet de la page (pas une
  // navigation client-side) : useSession() repart de "loading" et doit
  // refaire son fetch de session avant que le token soit disponible. Sans
  // attendre "authenticated", l'appel capture partait avec status encore
  // "loading" → useApi tombait dans la branche visiteur (x-session-token
  // au lieu du Bearer), et le backend renvoyait 401 "Token manquant".
  const { status: sessionStatus } = useSession();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // commandeId et sessionStatus sont déjà connus de façon synchrone (via
    // useSearchParams()/useSession()) — pas besoin d'un effet pour ces deux
    // cas, voir effectiveStatus/effectiveMessage plus bas (évite un
    // setState synchrone dans le corps de l'effet, que la règle
    // react-hooks/set-state-in-effect interdit).
    if (sessionStatus === "loading" || sessionStatus === "unauthenticated" || !commandeId) {
      return;
    }
    api<{ statut: string }>(`/payments/${commandeId}/capture`, { method: "POST" })
      .then((paiement) => {
        if (paiement.statut === "SUCCESS") {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(
            "Le paiement n'a pas été accepté par PayPal. La commande a été annulée, tes articles sont toujours dans ton panier.",
          );
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Erreur lors de la confirmation du paiement");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandeId, sessionStatus]);

  // commandeId manquant / session expirée : dérivés directement du render,
  // jamais via l'effet (voir commentaire ci-dessus).
  const effectiveStatus = !commandeId || sessionStatus === "unauthenticated" ? "error" : status;
  const effectiveMessage = !commandeId
    ? "Commande introuvable dans le lien de retour."
    : sessionStatus === "unauthenticated"
      ? "Ta session a expiré pendant le paiement. Reconnecte-toi, ton paiement PayPal n'a pas été perdu — retente depuis ta commande."
      : message;

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center animate-fade-in">
      {effectiveStatus === "loading" && (
        <>
          <span className="inline-block h-8 w-8 rounded-full border-2 border-border border-t-brand animate-spin mb-4" />
          <p className="text-foreground/70">Confirmation du paiement en cours...</p>
        </>
      )}

      {effectiveStatus === "success" && (
        <>
          <p className="text-2xl mb-2">✓</p>
          <h1 className="text-lg font-semibold mb-2">Paiement confirmé</h1>
          <p className="text-sm text-foreground/60 mb-6">
            Ta facture a été générée et envoyée par email.
          </p>
          {commandeId && (
            <Link href={`/client/commandes/${commandeId}`}>
              <Button>Voir ma commande</Button>
            </Link>
          )}
        </>
      )}

      {effectiveStatus === "error" && (
        <>
          <h1 className="text-lg font-semibold mb-2 text-red-600">Paiement non confirmé</h1>
          <p className="text-sm text-foreground/60 mb-6">{effectiveMessage}</p>
          <Link href="/panier">
            <Button variant="outline">Voir mon panier</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function PaiementRetourPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-6 py-16 text-center text-foreground/60">
          Chargement...
        </div>
      }
    >
      <PaiementRetourContent />
    </Suspense>
  );
}
