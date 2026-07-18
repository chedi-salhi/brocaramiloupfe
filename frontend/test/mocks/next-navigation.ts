// Stub utilisé uniquement par vitest.config.ts (alias "next/navigation" -> ce
// fichier) : permet à Vite de résoudre l'import même si le "next" installé
// n'expose pas ce sous-chemin (voir échec observé en juillet 2026 avec
// "next/navigation" introuvable). Chaque test qui a besoin d'assertions
// dessus fait quand même son propre vi.mock("next/navigation", ...) — cet
// alias ne fait que garantir que le spécificateur est résoluble.
export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}
