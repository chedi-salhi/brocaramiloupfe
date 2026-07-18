import type { Produit } from "@/lib/types";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { Card } from "@/components/ui/card";
import { resolveMediaUrl } from "@/lib/media";

export function ProductCard({ produit }: { produit: Produit }) {
  const image = resolveMediaUrl(produit.imageUrl);

  return (
    <Card className="flex flex-col gap-3 group">
      <div className="relative aspect-square rounded-lg bg-surface-muted flex items-center justify-center overflow-hidden">
        <FavoriteButton produitId={produit.idProduit} />
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={produit.nom}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span className="text-3xl font-semibold text-border select-none transition-transform duration-300 group-hover:scale-110">
            {produit.nom.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-medium leading-snug">{produit.nom}</h2>
        {produit.description && (
          <p className="text-sm text-foreground/60 line-clamp-2">{produit.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="font-semibold text-brand">{produit.prix} DT</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            produit.isAvailable && produit.stock > 0
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
          }`}
        >
          {produit.isAvailable && produit.stock > 0 ? `Stock : ${produit.stock}` : "Épuisé"}
        </span>
      </div>

      <AddToCartButton produitId={produit.idProduit} disabled={!produit.isAvailable} />
    </Card>
  );
}
