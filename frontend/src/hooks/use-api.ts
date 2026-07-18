"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { getSessionToken } from "@/lib/session-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Équivalent client-side de lib/api-client.ts (qui ne marche que côté
// serveur). À utiliser dans les composants "use client" pour les actions
// interactives : ajouter au panier, passer commande, envoyer un message...
export function useApi() {
  const { data: session } = useSession();

  return useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers);
      headers.set("Content-Type", "application/json");
      if (session?.accessToken) {
        headers.set("Authorization", `Bearer ${session.accessToken}`);
      } else {
        // Visiteur non connecté : on identifie son panier/favoris via un
        // jeton anonyme, fusionné côté backend à la connexion.
        headers.set("x-session-token", getSessionToken());
      }

      const response = await fetch(`${API_URL}${path}`, { ...options, headers });

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw new Error(
          `Erreur API ${response.status} : ${body?.message ?? response.statusText}`,
        );
      }
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    },
    [session?.accessToken],
  );
}
