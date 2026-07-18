import { apiFetch } from "@/lib/api-client";
import type { Commande } from "@/lib/types";
import { LivreurDashboard } from "@/components/livreur/livreur-dashboard";

export default async function LivreurPage() {
  const commandes = await apiFetch<Commande[]>("/orders/mine");

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 animate-fade-in">
      <h1 className="text-xl font-semibold mb-6">Mon espace livreur</h1>
      <LivreurDashboard commandes={commandes} />
    </div>
  );
}
