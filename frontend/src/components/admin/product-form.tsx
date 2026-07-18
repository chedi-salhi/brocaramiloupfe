"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useUpload } from "@/hooks/use-upload";
import { resolveMediaUrl } from "@/lib/media";
import type { Categorie, Produit } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ProductForm({
  produit,
  categories,
  onDone,
}: {
  produit?: Produit;
  categories: Categorie[];
  onDone: () => void;
}) {
  const api = useApi();
  const upload = useUpload();
  const router = useRouter();

  const [nom, setNom] = useState(produit?.nom ?? "");
  const [description, setDescription] = useState(produit?.description ?? "");
  const [prix, setPrix] = useState(produit?.prix ?? "");
  const [stock, setStock] = useState(produit?.stock?.toString() ?? "");
  const [categorieId, setCategorieId] = useState(
    produit?.categorieId?.toString() ?? categories[0]?.idCategorie?.toString() ?? "",
  );
  const [imageUrl, setImageUrl] = useState(produit?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await upload(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      nom,
      description,
      prix: Number(prix),
      stock: Number(stock),
      categorieId: Number(categorieId),
      imageUrl: imageUrl || undefined,
    };

    try {
      if (produit) {
        await api(`/products/${produit.idProduit}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/products", { method: "POST", body: JSON.stringify(payload) });
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  const preview = resolveMediaUrl(imageUrl);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-lg bg-surface-muted overflow-hidden flex items-center justify-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-foreground/40">Aucune image</span>
          )}
        </div>
        <label className="text-sm flex-1">
          Image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="block w-full text-sm mt-1"
          />
          {uploading && <span className="text-xs text-foreground/50">Envoi...</span>}
        </label>
      </div>

      <label className="text-sm">
        Nom
        <input
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </label>

      <label className="text-sm">
        Description
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Prix (DT)
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </label>
        <label className="text-sm">
          Stock
          <input
            required
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </label>
      </div>

      <label className="text-sm">
        Catégorie
        <select
          required
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        >
          {categories.map((c) => (
            <option key={c.idCategorie} value={c.idCategorie}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600 animate-fade-in">{error}</p>}

      <Button disabled={loading || uploading} className="mt-2">
        {loading ? "Enregistrement..." : produit ? "Enregistrer" : "Créer le produit"}
      </Button>
    </form>
  );
}
