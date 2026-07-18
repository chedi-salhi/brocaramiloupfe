"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { Categorie } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function CategoriesPanel({ categories }: { categories: Categorie[] }) {
  const api = useApi();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/categories", { method: "POST", body: JSON.stringify({ nom }) });
      setNom("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api(`/categories/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer (produits liés ?)");
    }
  }

  return (
    <div className="border border-border rounded-lg bg-surface mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span>Catégories ({categories.length})</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.idCategorie}
                className="flex items-center gap-2 text-sm bg-surface-muted rounded-full pl-3 pr-1 py-1"
              >
                {c.nom}
                <button
                  onClick={() => handleDelete(c.idCategorie)}
                  className="h-5 w-5 rounded-full hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400 flex items-center justify-center text-xs"
                  aria-label={`Supprimer ${c.nom}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nouvelle catégorie"
              className="flex-1 border border-border rounded-md p-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            <Button disabled={loading} type="submit">
              Ajouter
            </Button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
