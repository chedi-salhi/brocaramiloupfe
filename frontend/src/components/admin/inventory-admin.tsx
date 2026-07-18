"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Categorie, Commande, Produit } from "@/lib/types";
import { useApi } from "@/hooks/use-api";
import { resolveMediaUrl } from "@/lib/media";
import { StatCard } from "@/components/charts/stat-card";
import { BarChart } from "@/components/charts/bar-chart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SEUIL_STOCK_FAIBLE = 5;

type Filtre = "all" | "rupture" | "faible" | "ok";

export function InventoryAdmin({
  produits,
  categories,
  commandes,
}: {
  produits: Produit[];
  categories: Categorie[];
  commandes: Commande[];
}) {
  const api = useApi();
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  // Total vendu par produit = somme des quantités sur toutes les commandes non
  // annulées (recalculé à la volée depuis GET /orders, pas de nouvelle table).
  const ventesParProduit = useMemo(() => {
    const map = new Map<number, number>();
    for (const commande of commandes) {
      if (commande.etat === "ANNULEE") continue;
      for (const item of commande.produits) {
        map.set(item.produitId, (map.get(item.produitId) ?? 0) + item.quantite);
      }
    }
    return map;
  }, [commandes]);

  const rows = useMemo(() => {
    return produits.map((p) => {
      const vendus = ventesParProduit.get(p.idProduit) ?? 0;
      const niveau: Filtre = p.stock === 0 ? "rupture" : p.stock <= SEUIL_STOCK_FAIBLE ? "faible" : "ok";
      return { produit: p, vendus, niveau };
    });
  }, [produits, ventesParProduit]);

  const stats = useMemo(() => {
    const rupture = rows.filter((r) => r.niveau === "rupture").length;
    const faible = rows.filter((r) => r.niveau === "faible").length;
    const valeurStock = produits.reduce((sum, p) => sum + p.stock * Number(p.prix), 0);
    return { total: produits.length, rupture, faible, valeurStock };
  }, [rows, produits]);

  const stockParCategorie = useMemo(() => {
    return categories
      .map((c) => ({
        label: c.nom,
        value: produits.filter((p) => p.categorieId === c.idCategorie).reduce((s, p) => s + p.stock, 0),
      }))
      .sort((a, b) => b.value - a.value);
  }, [categories, produits]);

  const filteredRows = rows
    .filter((r) => filtre === "all" || r.niveau === filtre)
    .filter((r) => r.produit.nom.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.produit.stock - b.produit.stock);

  async function saveStock(produitId: number) {
    const raw = drafts[produitId];
    if (raw === undefined) return;
    const stock = Number(raw);
    if (!Number.isInteger(stock) || stock < 0) return;

    setSavingId(produitId);
    try {
      await api(`/products/${produitId}`, { method: "PATCH", body: JSON.stringify({ stock }) });
      setDrafts((d) => {
        const next = { ...d };
        delete next[produitId];
        return next;
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Inventaire</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 stagger">
        <StatCard
          label="Produits"
          value={String(stats.total)}
          icon={<span>📦</span>}
          onClick={() => setFiltre("all")}
          active={filtre === "all"}
        />
        <StatCard
          label="Rupture de stock"
          value={String(stats.rupture)}
          icon={<span>🚫</span>}
          tone="red"
          onClick={() => setFiltre("rupture")}
          active={filtre === "rupture"}
        />
        <StatCard
          label="Stock faible"
          value={String(stats.faible)}
          icon={<span>⚠️</span>}
          tone="amber"
          onClick={() => setFiltre("faible")}
          active={filtre === "faible"}
        />
        <StatCard
          label="Valeur du stock"
          value={`${stats.valeurStock.toFixed(0)} DT`}
          icon={<span>💰</span>}
          tone="green"
        />
      </div>

      {stockParCategorie.length > 0 && (
        <Card hoverable={false} className="mb-6">
          <h2 className="font-medium mb-3">Stock par catégorie</h2>
          <BarChart data={stockParCategorie} unit=" u." />
        </Card>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="border border-border rounded-full px-4 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand flex-1 max-w-xs"
        />
        {filtre !== "all" && (
          <button
            onClick={() => setFiltre("all")}
            className="text-xs text-foreground/50 hover:text-brand"
          >
            ✕ Retirer le filtre
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 stagger">
        {filteredRows.length === 0 && (
          <p className="text-sm text-foreground/50">Aucun produit ne correspond.</p>
        )}
        {filteredRows.map(({ produit, vendus, niveau }) => {
          const preview = resolveMediaUrl(produit.imageUrl);
          const draft = drafts[produit.idProduit];
          const badge =
            niveau === "rupture"
              ? { label: "Rupture", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" }
              : niveau === "faible"
                ? { label: "Stock faible", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" }
                : { label: "OK", cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" };

          return (
            <div
              key={produit.idProduit}
              className="flex items-center gap-4 border border-border rounded-lg p-3 bg-surface"
            >
              <div className="h-12 w-12 shrink-0 rounded-lg bg-surface-muted overflow-hidden flex items-center justify-center">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-foreground/40">–</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{produit.nom}</p>
                <p className="text-sm text-foreground/60">
                  {produit.categorie?.nom} · {vendus} vendu{vendus > 1 ? "s" : ""}
                </p>
              </div>

              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min={0}
                  value={draft ?? produit.stock}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [produit.idProduit]: e.target.value }))
                  }
                  className="w-20 border border-border rounded-md p-1.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <Button
                  variant="outline"
                  className="text-xs px-2.5 py-1"
                  disabled={draft === undefined || savingId === produit.idProduit}
                  onClick={() => saveStock(produit.idProduit)}
                >
                  {savingId === produit.idProduit ? "..." : "Mettre à jour"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
