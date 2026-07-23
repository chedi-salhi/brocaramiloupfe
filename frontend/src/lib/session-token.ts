// Jeton anonyme pour le panier/favoris visiteur (header x-session-token
// attendu par CartService/FavoritesService côté backend). Généré une fois,
// persisté en localStorage ; le backend fusionne automatiquement ce panier
// dans le compte utilisateur dès qu'une requête arrive authentifiée ET avec
// ce header — pas besoin d'appeler un endpoint de fusion dédié.
const STORAGE_KEY = "brocaramilou_session_token";

// crypto.randomUUID() n'existe que dans un "contexte sécurisé" (HTTPS, ou
// http://localhost) — indisponible sur http://keycloak:3000 (hostname
// personnalisé requis par le mode tout-Docker, voir RECOVERY.md), ce qui
// jetait "crypto.randomUUID is not a function" et cassait tout appel API
// dès qu'aucun jeton n'existait encore en localStorage (première visite du
// navigateur). Pas besoin de vraie sécurité cryptographique ici — juste un
// identifiant à peu près unique — donc un simple fallback suffit.
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";

  let token = window.localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = generateSessionId();
    window.localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}
