import type { Categorie } from "@/lib/types";

// Bande défilante droite -> gauche présentant les catégories du catalogue.
// Le tableau est dupliqué pour que la boucle CSS (translateX -50%) soit
// invisible ; pas besoin de JS, juste une animation CSS continue.
export function CategoryMarquee({ categories }: { categories: Categorie[] }) {
  if (categories.length === 0) return null;

  const items = [...categories, ...categories];

  return (
    <div className="overflow-hidden mt-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex gap-3 w-max animate-marquee">
        {items.map((c, i) => (
          <span
            key={`${c.idCategorie}-${i}`}
            className="shrink-0 text-sm font-medium px-4 py-2 rounded-full border border-black/20 bg-black/5 backdrop-blur-sm whitespace-nowrap"
          >
            {c.nom}
          </span>
        ))}
      </div>
    </div>
  );
}
