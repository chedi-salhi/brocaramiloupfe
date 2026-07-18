import { apiFetch } from "@/lib/api-client";
import type { Categorie, Produit } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
import { CatalogueFilters } from "@/components/catalogue-filters";
import { CategoryMarquee } from "@/components/category-marquee";
import { FavoritesProvider } from "@/components/favorites-provider";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorieId?: string }>;
}) {
  const { q, categorieId } = await searchParams;

  const query = new URLSearchParams();
  if (q) query.set("search", q);
  if (categorieId) query.set("categorieId", categorieId);

  const [produits, categories] = await Promise.all([
    apiFetch<Produit[]>(`/products${query.toString() ? `?${query.toString()}` : ""}`),
    apiFetch<Categorie[]>("/categories"),
  ]);

  return (
    <div>
      <div className="bg-ink text-white text-center py-2 px-4 overflow-x-auto">
        <p className="text-xs sm:text-sm font-medium whitespace-nowrap inline-block">
          📦 Vente en gros et au détail | 🚚 Livraison rapide partout en Tunisie
        </p>
      </div>

      <section
        className="relative overflow-hidden bg-ink text-white bg-cover bg-center min-h-[320px] flex items-center"
        style={{ backgroundImage: "url(/hero-banner.png)" }}
      >
        {/* Dégradé sombre : la bannière est très claire à droite, sans ça le
            texte blanc devient illisible par-dessus. */}
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative py-16 animate-fade-in w-full">
          <p
            className="font-black tracking-tight text-4xl sm:text-6xl mb-4 animate-glow pl-0 ml-0"
            style={{
              fontFamily: "var(--font-montserrat)",
              color: "#8B0000",
              WebkitTextStroke: "2px black",
              paintOrder: "stroke fill",
              textShadow: "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
            }}
          >
            Bienvenue chez Brocaramilou
          </p>
          <div className="mt-4 w-full max-w-6xl mx-auto px-6">
            <div className="max-w-3xl">
              <CategoryMarquee categories={categories} />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold mb-4">Catalogue</h2>

        <CatalogueFilters categories={categories} />

        {produits.length === 0 ? (
          <p className="text-foreground/60">
            {q || categorieId
              ? "Aucun produit ne correspond à ta recherche."
              : "Aucun produit disponible pour le moment."}
          </p>
        ) : (
          <FavoritesProvider>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 stagger">
              {produits.map((produit) => (
                <ProductCard key={produit.idProduit} produit={produit} />
              ))}
            </div>
          </FavoritesProvider>
        )}
      </div>
    </div>
  );
}
