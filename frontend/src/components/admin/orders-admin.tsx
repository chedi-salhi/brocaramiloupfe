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
    setBusyId(commandeId);
    try {
      await api(`/orders/${commandeId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ etat }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Commandes</h1>

      <div className="flex flex-col gap-3 stagger">
        {commandes.map((commande) => (
          <div
            key={commande.idCommande}
            className="border border-border rounded-lg p-4 bg-surface flex flex-col gap-3"
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
              <label className="text-sm flex items-center gap-2">
                Livreur :
                <select
                  disabled={busyId === commande.idCommande}
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

              <div className="flex gap-1.5 ml-auto">
                {ETATS.map((etat) => (
                  <Button
                    key={etat}
                    variant={commande.etat === etat ? "primary" : "outline"}
                    disabled={busyId === commande.idCommande}
                    onClick={() => updateStatus(commande.idCommande, etat)}
                    className="text-xs px-2.5 py-1"
                  >
                    {LABELS[etat]}
                  </Button>
                ))}
              </div>
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
        ))}
      </div>

      {invoiceError && <p className="text-sm text-red-600 mt-3">{invoiceError}</p>}
    </div>
  );
}
