// Jeton anonyme pour le panier/favoris visiteur (header x-session-token
// attendu par CartService/FavoritesService côté backend). Généré une fois,
// persisté en localStorage ; le backend fusionne automatiquement ce panier
// dans le compte utilisateur dès qu'une requête arrive authentifiée ET avec
// ce header — pas besoin d'appeler un endpoint de fusion dédié.
const STORAGE_KEY = "brocaramilou_session_token";

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";

  let token = window.localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}
