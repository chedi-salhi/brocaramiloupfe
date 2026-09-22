// Jeton anonyme pour le panier/favoris visiteur (header x-session-token
// attendu par CartService/FavoritesService côté backend). Généré une fois,
// persisté en localStorage ; le backend fusionne automatiquement ce panier
// dans le compte utilisateur dès qu'une requête arrive authentifiée ET avec
// ce header — pas besoin d'appeler un endpoint de fusion dédié.
const STORAGE_KEY = "brocaramilou_session_token";

// crypto.randomUUID() n'existe que dans un "contexte sécurisé" (HTTPS, ou
// http://localhost) — indisponible sur http://keycloak:3000 (hostname
// personnalisé requis par le mode tout-Docker, voir RECOVERY.md), ce qui
// jetait "crypto.randomUUID is not a function" et cassait tout appel API dès
// qu'aucun jeton n'existait encore en localStorage (première visite du
// navigateur). crypto.getRandomValues(), contrairement à randomUUID(), reste
// disponible en contexte non sécurisé (seul SubtleCrypto y est restreint) —
// on l'utilise pour construire l'UUID nous-mêmes plutôt que de retomber sur
// Math.random(), un générateur non cryptographique qu'un scanner de
// sécurité signale à raison dès qu'il sert à produire un identifiant.
function generateSessionId(): string {
  if (typeof crypto === "undefined") {
    return `fallback-${Date.now()}-${Math.trunc(Math.random() * 1e9)}`;
  }
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
