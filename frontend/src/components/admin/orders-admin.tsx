"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Commande, EtatCommande, Utilisateur } from "@/lib/types";
import { useApi } from "@/hooks/use-api";
import { useInvoice } from "@/hooks/use-invoice";
import { PaymentConfirmButton } from "@/components/payment-confirm-button";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

const BADGE: Record<string, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  EN_LIVRAISON: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  LIVREE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  ANNULEE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const ETATS: EtatCommande[] = ["EN_ATTENTE", "EN_LIVRAISON", "LIVREE", "ANNULEE"];

export function OrdersAdmin({
  commandes,
  livreurs,
}: {
  commandes: Commande[];
  livreurs: Utilisateur[];
}) {
  const api = useApi();
  const router = useRouter();
  const { downloadInvoice, printInvoice } = useInvoice();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  // Une commande EN_LIGNE dont le paiement n'est pas encore SUCCESS n'a
  // jamais été confirmée par le client (checkout PayPal abandonné, refusé,
  // ou pas encore terminé) : ni le stock ni le panier n'ont été touchés
  // (voir OrdersService.create) tant que ce n'est pas le cas, donc ce n'est
  // pas une commande à traiter, juste du bruit dans la liste. Masquée par
  // défaut ; le toggle ci-dessous reste utile pour l'annuler manuellement
  // si le client a fermé l'onglet PayPal sans jamais revenir (nettoyage,
  // pas récupération de stock — voir OrdersService.cancel).
  const [showUnconfirmed, setShowUnconfirmed] = useState(false);

  async function handleDownload(commande: Commande) {
    try {
      await downloadInvoice(commande.idCommande, commande.facture?.numeroFacture);
    } catch {
      setInvoiceError("Facture indisponible (paiement pas encore confirmé ?)");
    }
  }

  async function handlePrint(commande: Commande) {
    try {
      await printInvoice(commande.idCommande);
    } catch {
      setInvoiceError("Facture indisponible (paiement pas encore confirmé ?)");
    }
  }

  async function assign(commandeId: number, livreurId: number) {
    setBusyId(commandeId);
    try {
      await api(`/orders/${commandeId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ livreurId }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(commandeId: number, etat: EtatCommande) {
    // Annulation : action destructive (stock déjà décrémenté, client déjà
    // notifié) — une confirmation explicite évite un clic accidentel parmi
    // les 4 boutons de statut.
    if (etat === "ANNULEE" && !window.confirm("Voulez-vous vraiment annuler cette commande ?")) {
      return;
    }

    setBusyId(commandeId);
    setStatusError(null);
    try {
      await api(`/orders/${commandeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ etat }),
      });
      router.refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  // Une commande à la livraison est déjà "confirmée par le client" dès sa
  // création (pas d'étape externe équivalente au checkout PayPal) — seule
  // EN_LIGNE a un état intermédiaire "pas encore confirmé".
  const isUnconfirmedEnLigne = (commande: Commande) =>
    commande.paiement?.methodePaiement === "EN_LIGNE" &&
    commande.paiement.statut !== "SUCCESS";
  const hiddenCount = commandes.filter(isUnconfirmedEnLigne).length;
  const visibleCommandes = showUnconfirmed
    ? commandes
    : commandes.filter((c) => !isUnconfirmedEnLigne(c));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Commandes</h1>
        {hiddenCount > 0 && (
          <button
            type="button"
            data-testid="toggle-unconfirmed-orders"
            onClick={() => setShowUnconfirmed((v) => !v)}
            className="text-xs text-foreground/60 hover:text-foreground underline underline-offset-2"
          >
            {showUnconfirmed
              ? "Masquer les paiements en ligne non confirmés"
              : `${hiddenCount} paiement${hiddenCount > 1 ? "s" : ""} en ligne non confirmé${hiddenCount > 1 ? "s" : ""} masqué${hiddenCount > 1 ? "s" : ""} — afficher`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 stagger">
        {visibleCommandes.map((commande) => {
          // Livrée ou Annulée = définitif (voir OrdersService.updateStatus,
          // qui refuse désormais toute modification passé ce point) — le
          // livreur assigné et le statut ne sont donc plus modifiables du
          // tout depuis cette carte une fois l'un ou l'autre atteint.
          const isClosed = commande.etat === "LIVREE" || commande.etat === "ANNULEE";
          // Commande en ligne pas encore payée (paiement resté PENDING/FAILED,
          // checkout PayPal jamais terminé ou refusé) : le backend refuse
          // toute assignation de livreur et toute progression autre que
          // l'annulation (voir OrdersService.assignLivreur/updateStatus) —
          // on reflète ça ici pour ne pas laisser l'admin croire que la
          // commande est confirmée.
          const enLigneNonPayee = isUnconfirmedEnLigne(commande);
          return (
          <div
            key={commande.idCommande}
            className="border border-border rounded-lg p-4 bg-surface flex flex-col gap-3"
            data-testid={`admin-order-${commande.idCommande}`}
          >
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <p className="font-medium">
                  Commande #{commande.idCommande}
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${BADGE[commande.etat] ?? ""}`}
                  >
                    {LABELS[commande.etat] ?? commande.etat}
                  </span>
                </p>
                {commande.utilisateur && (
                  <p className="text-sm font-medium text-foreground/80 mt-0.5">
                    Client : {commande.utilisateur.prenom} {commande.utilisateur.nom}
                  </p>
                )}
                <p className="text-sm text-foreground/60">
                  {new Date(commande.dateCommande).toLocaleString("fr-FR")} —{" "}
                  {commande.adresseLivraison}
                </p>
              </div>
              <span className="font-semibold text-brand">{commande.montantTotal} DT</span>
            </div>

            <div className="text-sm text-foreground/70 flex flex-wrap gap-x-4 gap-y-1">
              {commande.produits.map((item) => (
                <span key={item.idCommandeProduit}>
                  {item.produit.nom} × {item.quantite}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap border-t border-border pt-3">
              {isClosed ? (
                // Commande clôturée : le livreur assigné ne change plus,
                // simple affichage au lieu du <select> modifiable.
                <span className="text-sm">
                  Livreur : <span className="font-medium">
                    {commande.livreur ? `${commande.livreur.prenom ?? ""} ${commande.livreur.nom}`.trim() : "Non assigné"}
                  </span>
                </span>
              ) : (
                <label className="text-sm flex items-center gap-2">
                  Livreur :
                  <select
                    disabled={busyId === commande.idCommande || enLigneNonPayee}
                    title={enLigneNonPayee ? "Paiement en ligne non confirmé" : undefined}
                    defaultValue={commande.livreurId ?? ""}
                    onChange={(e) => assign(commande.idCommande, Number(e.target.value))}
                    className="border border-border rounded-md p-1.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  >
                    <option value="" disabled>
                      Choisir...
                    </option>
                    {livreurs.map((l) => (
                      <option key={l.idUtilisateur} value={l.idUtilisateur}>
                        {l.prenom} {l.nom}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {isClosed ? (
                // Statut définitif (voir OrdersService.updateStatus) : plus
                // aucun bouton de changement d'état, seul le badge en tête
                // de carte reste comme indicateur.
                <span className="text-xs text-foreground/50 ml-auto">Statut définitif</span>
              ) : (
                <div className="flex gap-1.5 ml-auto">
                  {ETATS.map((etat) => {
                    // Même règle que côté livreur (voir DeliveryStatusForm) : pour
                    // le paiement à la livraison, le cash doit être confirmé
                    // (PaymentConfirmButton ci-dessous) avant de pouvoir marquer
                    // "Livrée" — sinon le backend refuse avec une 400.
                    const cashNonConfirme =
                      etat === "LIVREE" &&
                      commande.paiement?.methodePaiement === "A_LA_LIVRAISON" &&
                      commande.paiement.statut !== "SUCCESS";
                    // Paiement en ligne non confirmé : seule l'annulation
                    // reste possible (voir OrdersService.updateStatus).
                    const bloqueParPaiementEnLigne = enLigneNonPayee && etat !== "ANNULEE";
                    const tooltip = bloqueParPaiementEnLigne
                      ? "Paiement en ligne non confirmé"
                      : cashNonConfirme
                        ? "Confirme le paiement cash reçu avant de marquer livrée"
                        : undefined;
                    return (
                      <Button
                        key={etat}
                        variant={commande.etat === etat ? "primary" : "outline"}
                        disabled={busyId === commande.idCommande || cashNonConfirme || bloqueParPaiementEnLigne}
                        title={tooltip}
                        onClick={() => updateStatus(commande.idCommande, etat)}
                        className="text-xs px-2.5 py-1"
                        data-testid={`admin-status-${etat}-${commande.idCommande}`}
                      >
                        {LABELS[etat]}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            {commande.paiement?.methodePaiement === "A_LA_LIVRAISON" && (
              <div className="border-t border-border pt-3">
                <span className="text-sm text-foreground/60">
                  Paiement à la livraison —{" "}
                  {commande.paiement.statut === "SUCCESS" ? "encaissé" : "en attente"}
                </span>
                <PaymentConfirmButton commande={commande} />
              </div>
            )}

            {enLigneNonPayee && (
              <div className="border-t border-border pt-3">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ Paiement en ligne non confirmé — le client n&apos;a pas terminé (ou a annulé)
                  le paiement PayPal. Cette commande n&apos;est pas confirmée.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <span className="text-sm text-foreground/60">
                Facture
                {commande.facture ? ` ${commande.facture.numeroFacture}` : " : non générée"}
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  className="text-xs px-2.5 py-1"
                  disabled={!commande.facture}
                  onClick={() => handleDownload(commande)}
                >
                  ⬇ Télécharger
                </Button>
                <Button
                  variant="outline"
                  className="text-xs px-2.5 py-1"
                  disabled={!commande.facture}
                  onClick={() => handlePrint(commande)}
                >
                  🖨 Imprimer
                </Button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {invoiceError && <p className="text-sm text-red-600 mt-3">{invoiceError}</p>}
      {statusError && <p className="text-sm text-red-600 mt-3">{statusError}</p>}
    </div>
  );
}
