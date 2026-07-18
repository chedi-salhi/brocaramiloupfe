import { DefaultSession } from "next-auth";

// Étend les types NextAuth pour exposer l'access token Keycloak et les rôles
// realm (admin/client/livreur) sur la session, utilisés par le middleware
// et par le client API pour appeler le backend NestJS.
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    roles?: string[];
    error?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    accessTokenExpires?: number;
    roles?: string[];
    error?: string;
  }
}
