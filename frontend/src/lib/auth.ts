import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { JWT } from "next-auth/jwt";

// Décode la partie payload d'un JWT sans vérifier la signature : on fait
// juste confiance au token qu'on vient de recevoir de Keycloak en direct,
// la vérification cryptographique appartient au backend NestJS (JWKS).
function extractRoles(accessToken: string): string[] {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64").toString("utf-8"),
    );
    return payload.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
    const params = new URLSearchParams({
      client_id: process.env.KEYCLOAK_CLIENT_ID!,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      roles: extractRoles(refreshed.access_token),
      error: undefined,
    };
  } catch (error) {
    console.error("Échec du rafraîchissement du token Keycloak", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // Première connexion : Keycloak vient de nous donner les tokens.
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          idToken: account.id_token,
          accessTokenExpires: (account.expires_at ?? 0) * 1000,
          roles: extractRoles(account.access_token as string),
        };
      }

      // Token encore valide (Keycloak émet des access tokens de courte durée,
      // ~5 min) : on le renouvelle avant expiration plutôt que d'attendre 401.
      if (Date.now() < ((token.accessTokenExpires as number) ?? 0) - 10_000) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.idToken = token.idToken as string | undefined;
      session.roles = (token.roles as string[]) ?? [];
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
