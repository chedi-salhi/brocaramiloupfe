"use client";

import { useFavorites } from "@/components/favorites-provider";

export function FavoriteButton({ produitId }: { produitId: number }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(produitId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(produitId);
      }}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={active}
      className={`absolute top-2 right-2 z-10 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 active:scale-90 ${
        active
          ? "bg-brand text-white shadow-md"
          : "bg-white/80 text-foreground/60 hover:text-brand dark:bg-black/50"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d="M12 21s-6.7-4.35-9.3-8.05C.8 10.2 1.4 6.6 4.4 5.1c2.3-1.15 4.7-.3 6 1.4l1.6 2 1.6-2c1.3-1.7 3.7-2.55 6-1.4 3 1.5 3.6 5.1 1.7 7.85C18.7 16.65 12 21 12 21Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
