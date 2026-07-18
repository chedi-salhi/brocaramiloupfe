"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Categorie } from "@/lib/types";

export function CatalogueFilters({ categories }: { categories: Categorie[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentCategorieId = searchParams.get("categorieId") ?? "";
  const [q, setQ] = useState(currentQ);

  // Recherche "à la frappe" mais avec un léger délai pour éviter une requête
  // au serveur à chaque caractère.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (q === currentQ) return;
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function selectCategorie(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("categorieId", id);
    else params.delete("categorieId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1 max-w-sm">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full border border-border rounded-full pl-9 pr-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </div>

      <div className="relative w-full sm:w-64">
        <select
          value={currentCategorieId}
          onChange={(e) => selectCategorie(e.target.value)}
          className="w-full appearance-none border border-border rounded-full pl-4 pr-9 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand cursor-pointer"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.idCategorie} value={String(c.idCategorie)}>
              {c.nom}
            </option>
          ))}
        </select>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
