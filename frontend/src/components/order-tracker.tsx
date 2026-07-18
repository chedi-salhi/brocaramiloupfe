"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { createSocket } from "@/lib/socket";
import type { Commande } from "@/lib/types";
import { OrderStepper } from "@/components/order-stepper";
import { Card } from "@/components/ui/card";
import { LivreurChat } from "@/components/livreur-chat";

const LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

// S'abonne au namespace /tracking pour recevoir les mises à jour de statut
// en temps réel (voir TrackingGateway.notifyOrderUpdate côté backend,
// déclenché par OrdersService.updateStatus).
export function OrderTracker({ initialCommande }: { initialCommande: Commande }) {
  const { data: session } = useSession();
  const [commande, setCommande] = useState(initialCommande);
  const [justUpdated, setJustUpdated] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) return;

    const socket = createSocket("/tracking", session.accessToken);
    socket.on("order:update", (updated: Commande) => {
      if (updated.idCommande === initialCommande.idCommande) {
        setCommande(updated);
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken, initialCommande.idCommande]);

  return (
    <div className="flex flex-col gap-6">
      <Card hoverable={false} className={justUpdated ? "ring-2 ring-brand/50" : ""}>
        <OrderStepper etat={commande.etat} />
      </Card>

      {commande.livreur && (
        <Card hoverable={false}>
          <h2 className="font-medium mb-3">Livreur assigné</h2>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="font-medium">
                {commande.livreur.prenom} {commande.livreur.nom}
              </p>
              {commande.livreur.numTelephone && (
                <p className="text-sm text-foreground/60">{commande.livreur.numTelephone}</p>
              )}
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted shrink-0">
              {LABELS[commande.etat] ?? commande.etat}
            </span>
          </div>
          <LivreurChat
            livreurId={commande.livreur.idUtilisateur}
            livreurNom={`${commande.livreur.prenom ?? ""} ${commande.livreur.nom}`.trim()}
          />
        </Card>
      )}

      <Card hoverable={false}>
        <h2 className="font-medium mb-3">Produits</h2>
        <div className="flex flex-col gap-2">
          {commande.produits.map((item) => (
            <div key={item.idCommandeProduit} className="flex justify-between text-sm">
              <span>
                {item.produit.nom} × {item.quantite}
              </span>
              <span className="font-medium">{item.prixUnitaire} DT</span>
            </div>
          ))}
        </div>
      </Card>

      <Card hoverable={false}>
        <h2 className="font-medium mb-3">Historique</h2>
        <div className="flex flex-col gap-1 text-sm text-foreground/60">
          {commande.historique.map((suivi) => (
            <span key={suivi.idSuivi}>
              {LABELS[suivi.etat] ?? suivi.etat} —{" "}
              {new Date(suivi.createdAt).toLocaleString("fr-FR")}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
