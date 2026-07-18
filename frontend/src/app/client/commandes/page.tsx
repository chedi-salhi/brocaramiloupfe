import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import type { Commande } from "@/lib/types";
import { Card } from "@/components/ui/card";

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

export default async function CommandesPage() {
  const commandes = await apiFetch<Commande[]>("/orders/mine");

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-semibold mb-4">Mes commandes</h1>

      {commandes.length === 0 ? (
        <p className="text-foreground/60">Aucune commande pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {commandes.map((commande) => (
            <Link key={commande.idCommande} href={`/client/commandes/${commande.idCommande}`}>
              <Card className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Commande #{commande.idCommande}</p>
                  <p className="text-sm text-foreground/60">
                    {new Date(commande.dateCommande).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-semibold text-brand">{commande.montantTotal} DT</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[commande.etat] ?? ""}`}>
                    {LABELS[commande.etat] ?? commande.etat}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
