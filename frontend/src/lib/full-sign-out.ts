import { signOut } from "next-auth/react";

const KEYCLOAK_ISSUER =
  process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ?? "http://localhost:8080/realms/brocaramilou";

// signOut() de NextAuth ne ferme que la session applicative (cookie NextAuth).
// Keycloak garde sa propre session SSO active : sans ça, un "Connexion"
// suivant reconnecte silencieusement avec le compte précédent au lieu de
// redemander les identifiants. On ferme donc aussi la session Keycloak via
// son endpoint de logout, avec id_token_hint pour identifier quelle session
// terminer.
export async function fullSignOut(idToken?: string) {
  await signOut({ redirect: false });

  const logoutUrl = new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("post_logout_redirect_uri", window.location.origin);
  if (idToken) {
    logoutUrl.searchParams.set("id_token_hint", idToken);
  }

  window.location.href = logoutUrl.toString();
}
