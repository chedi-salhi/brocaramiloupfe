import { apiFetch } from "@/lib/api-client";
import { StatCard } from "@/components/charts/stat-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { Card } from "@/components/ui/card";

interface DashboardStats {
  ventesTotales: number;
  commandesTotales: number;
  commandesParEtat: { etat: string; total: number }[];
  produitsPopulaires: { produit: { nom: string } | null; quantiteVendue: number }[];
}

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

export default async function AdminDashboard() {
  const stats = await apiFetch<DashboardStats>("/dashboard");

  const parEtat = (etat: string) =>
    stats.commandesParEtat.find((c) => c.etat === etat)?.total ?? 0;

  const livrees = parEtat("LIVREE");
  const annulees = parEtat("ANNULEE");
  const tauxLivraison = stats.commandesTotales
    ? Math.round((livrees / stats.commandesTotales) * 100)
    : 0;
  const tauxAnnulation = stats.commandesTotales
    ? Math.round((annulees / stats.commandesTotales) * 100)
    : 0;
  const panierMoyen = stats.commandesTotales
    ? stats.ventesTotales / stats.commandesTotales
    : 0;

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-semibold mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        <StatCard
          label="Ventes totales"
          value={`${stats.ventesTotales.toFixed(2)} DT`}
          tone="brand"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
            </svg>
          }
        />
        <StatCard
          label="Commandes"
          value={String(stats.commandesTotales)}
          tone="amber"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7 12 3 4 7v10l8 4 8-4V7Z" strokeLinejoin="round" />
              <path d="M4 7l8 4 8-4M12 11v10" />
            </svg>
          }
        />
        <StatCard
          label="Taux de livraison"
          value={`${tauxLivraison}%`}
          tone="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Panier moyen"
          value={`${panierMoyen.toFixed(2)} DT`}
          tone={tauxAnnulation > 20 ? "red" : "brand"}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card hoverable={false}>
          <h2 className="font-medium mb-4">Répartition des commandes par état</h2>
          <DonutChart
            data={stats.commandesParEtat.map((c) => ({
              label: ETAT_LABELS[c.etat] ?? c.etat,
              value: c.total,
              color: ETAT_COLORS[c.etat] ?? "#999",
            }))}
          />
        </Card>

        <Card hoverable={false}>
          <h2 className="font-medium mb-4">Produits les plus vendus</h2>
          <BarChart
            data={stats.produitsPopulaires.map((p) => ({
              label: p.produit?.nom ?? "Produit supprimé",
              value: p.quantiteVendue,
            }))}
            unit=" vendus"
          />
        </Card>
      </div>
    </div>
  );
}
