"use client";

import { useState } from "react";
import type { Commande, EtatCommande } from "@/lib/types";
import { StatCard } from "@/components/charts/stat-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card } from "@/components/ui/card";
import { DeliveryStatusForm } from "@/components/delivery-status-form";
import { PaymentConfirmButton } from "@/components/payment-confirm-button";

const ETAT_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

const ETAT_COLORS: Record<string, string> = {
  EN_ATTENTE: "#f59e0b",
  EN_LIVRAISON: "#3b82f6",
  LIVREE: "#22c55e",
  ANNULEE: "#d21f1f",
};

const BADGE: Record<string, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  EN_LIVRAISON: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  LIVREE: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  ANNULEE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

type Filtre = "all" | EtatCommande;

// Tout est calculé à la volée à partir des commandes déjà récupérées via
// GET /orders/mine — aucune nouvelle donnée côté backend. Les cartes de
// stats servent aussi de filtre pour la liste juste en dessous.
export function LivreurDashboard({ commandes }: { commandes: Commande[] }) {
  const [filtre, setFiltre] = useState<Filtre>("all");

  const total = commandes.length;
  const parEtat = (etat: string) => commandes.filter((c) => c.etat === etat).length;

  const enAttente = parEtat("EN_ATTENTE");
  const enLivraison = parEtat("EN_LIVRAISON");
  const livrees = parEtat("LIVREE");
  const annulees = parEtat("ANNULEE");

  const tauxReussite = total > 0 ? Math.round((livrees / total) * 100) : 0;
  const montantLivre = commandes
    .filter((c) => c.etat === "LIVREE")
    .reduce((sum, c) => sum + Number(c.montantTotal), 0);

  const repartition = [
    { etat: "EN_ATTENTE", total: enAttente },
    { etat: "EN_LIVRAISON", total: enLivraison },
    { etat: "LIVREE", total: livrees },
    { etat: "ANNULEE", total: annulees },
  ].filter((e) => e.total > 0);

  const visibles = filtre === "all" ? commandes : commandes.filter((c) => c.etat === filtre);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard
          label="Livraisons assignées"
          value={String(total)}
          tone="brand"
          active={filtre === "all"}
          onClick={() => setFiltre("all")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h13l3 5v6h-3M3 7v11h3M3 7l2-4h9l2 4M9 18a2 2 0 1 0 4 0M6 18a2 2 0 1 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="En cours"
          value={String(enLivraison)}
          tone="amber"
          active={filtre === "EN_LIVRAISON"}
          onClick={() => setFiltre("EN_LIVRAISON")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Livrées"
          value={`${livrees} (${tauxReussite}%)`}
          tone="green"
          active={filtre === "LIVREE"}
          onClick={() => setFiltre("LIVREE")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Valeur livrée"
          value={`${montantLivre.toFixed(2)} DT`}
          tone="brand"
          active={filtre === "LIVREE"}
          onClick={() => setFiltre("LIVREE")}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {repartition.length > 0 && (
        <Card hoverable={false} className="mb-6">
          <h2 className="font-medium mb-4">Répartition de mes livraisons</h2>
          <DonutChart
            data={repartition.map((e) => ({
              label: ETAT_LABELS[e.etat] ?? e.etat,
              value: e.total,
              color: ETAT_COLORS[e.etat] ?? "#999",
            }))}
          />
        </Card>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">
          {filtre === "all" ? "Toutes mes livraisons" : ETAT_LABELS[filtre]}
        </h2>
        {filtre !== "all" && (
          <button onClick={() => setFiltre("all")} className="text-sm text-brand hover:underline">
            Voir tout
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="text-foreground/60">Aucune livraison dans cette catégorie.</p>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {visibles.map((commande) => (
            <Card key={commande.idCommande} hoverable={false} data-testid={`livreur-order-${commande.idCommande}`}>
              <div className="flex justify-between items-start">
                <p className="font-medium">Commande #{commande.idCommande}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[commande.etat] ?? ""}`}>
                  {ETAT_LABELS[commande.etat] ?? commande.etat}
                </span>
              </div>
              <p className="text-sm text-foreground/60 mt-1">{commande.adresseLivraison}</p>
              <p className="text-sm text-foreground/60">{commande.montantTotal} DT</p>
              <PaymentConfirmButton commande={commande} />
              <DeliveryStatusForm
                commandeId={commande.idCommande}
                etatActuel={commande.etat}
                paiement={commande.paiement}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
