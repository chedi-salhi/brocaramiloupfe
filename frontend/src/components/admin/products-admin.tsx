"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Categorie, Produit } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/media";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductForm } from "@/components/admin/product-form";

export function ProductsAdmin({
  produits,
  categories,
}: {
  produits: Produit[];
  categories: Categorie[];
}) {
  const api = useApi();
  const router = useRouter();
  const [editing, setEditing] = useState<Produit | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleAvailability(produit: Produit) {
    if (produit.isAvailable) {
      await api(`/products/${produit.idProduit}`, { method: "DELETE" });
    } else {
      await api(`/products/${produit.idProduit}`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: true }),
      });
    }
    router.refresh();
  }

  async function handleDelete(produit: Produit) {
    if (!confirm(`Supprimer définitivement "${produit.nom}" ? Cette action est irréversible.`)) {
      return;
    }
    setError(null);
    try {
      await api(`/products/${produit.idProduit}/permanent`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer ce produit");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Produits</h1>
        <Button onClick={() => setEditing("new")}>+ Nouveau produit</Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex flex-col gap-2 stagger">
        {produits.map((produit) => {
          const preview = resolveMediaUrl(produit.imageUrl);
          return (
            <div
              key={produit.idProduit}
              className="flex items-center gap-4 border border-border rounded-lg p-3 bg-surface"
            >
              <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-muted overflow-hidden flex items-center justify-center">
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
                  {produit.categorie?.nom} · {produit.prix} DT · Stock {produit.stock}
                </p>
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  produit.isAvailable
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}
              >
                {produit.isAvailable ? "Actif" : "Désactivé"}
              </span>

              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => setEditing(produit)}>
                  Modifier
                </Button>
                <Button
                  variant={produit.isAvailable ? "outline" : "primary"}
                  onClick={() => toggleAvailability(produit)}
                >
                  {produit.isAvailable ? "Désactiver" : "Réactiver"}
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleDelete(produit)}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nouveau produit" : "Modifier le produit"}
      >
        <ProductForm
          produit={editing === "new" ? undefined : (editing ?? undefined)}
          categories={categories}
          onDone={() => setEditing(null)}
        />
      </Modal>
    </div>
  );
}
