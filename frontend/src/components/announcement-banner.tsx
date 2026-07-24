"use client";

import { useEffect, useState } from "react";
import type { Annonce } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/media";

// Bandeau promo public (page d'accueil) : fait défiler les annonces actives
// en fondu-enchaîné, image en fond avec dégradé pour la lisibilité du texte,
// carte "verre dépoli" (backdrop-blur + fond semi-transparent) par-dessus.
export function AnnouncementBanner({ annonces }: { annonces: Annonce[] }) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (annonces.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % annonces.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [annonces.length]);

  if (annonces.length === 0 || dismissed) return null;

  return (
    <section className="relative w-full overflow-hidden h-[240px] sm:h-[300px] md:h-[360px] bg-ink animate-fade-in">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fermer l'annonce"
        className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition-colors duration-300"
      >
        ✕
      </button>

      {annonces.map((annonce, i) => {
        const image = resolveMediaUrl(annonce.mediaUrl);
        const isActive = i === index;
        return (
          <div
            key={annonce.idAnnonce}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                  isActive ? "scale-110" : "scale-100"
                }`}
              />
            )}
            {/* Dégradé sombre : même logique que le hero de la home, sans ça
                le texte blanc devient illisible par-dessus la photo. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

            <div className="relative z-10 h-full flex items-end sm:items-center">
              <div className="max-w-6xl mx-auto px-6 sm:px-10 pb-8 sm:pb-0 w-full">
                <div
                  className={`max-w-lg rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-5 sm:p-6 shadow-lg transition-all duration-700 ${
                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-widest text-white/70 mb-1.5">
                    Annonce
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
                    {annonce.titre}
                  </h3>
                  <p className="text-sm text-white/85 line-clamp-2">{annonce.description}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {annonces.length > 1 && (
        <div className="absolute bottom-0 inset-x-0 z-20 h-10 bg-gradient-to-t from-black/40 to-transparent backdrop-blur-[2px] flex items-center justify-center gap-2">
          {annonces.map((annonce, i) => (
            <button
              key={annonce.idAnnonce}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Voir l'annonce ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
