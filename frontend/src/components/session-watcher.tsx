"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { fullSignOut } from "@/lib/full-sign-out";

// Aujourd'hui, quand le refresh token Keycloak expire (session inactive trop
// longtemps), lib/auth.ts pose juste session.error = "RefreshAccessTokenError"
// mais RIEN ne réagissait à ce signal : l'utilisateur restait "connecté" côté
// app avec un token mort, d'où des erreurs "fetch failed" / 401 confuses un
// peu partout plutôt qu'un simple retour à l'écran de connexion.
// Ce composant surveille juste ce flag et déclenche une déconnexion propre.
export function SessionWatcher() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      fullSignOut(session.idToken);
    }
  }, [session?.error, session?.idToken]);

  return null;
}
