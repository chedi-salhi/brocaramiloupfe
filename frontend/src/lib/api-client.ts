import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Erreur API ${status}`);
  }
}

// Wrapper fetch pour Server Components / route handlers : lit la session
// NextAuth côté serveur et injecte automatiquement le Bearer token.
// Les visiteurs (pas de session) peuvent aussi appeler des routes publiques
// (produits, catégories) sans token.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await auth();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    // 401 avec un token envoyé = token expiré/invalide côté Keycloak (session
    // trop vieille) plutôt qu'une vraie absence d'autorisation. Plutôt que de
    // planter la page (Runtime Error visible par l'utilisateur), on le renvoie
    // se reconnecter — cas déjà géré côté client par SessionWatcher, ceci
    // couvre le rendu serveur qui s'exécute avant que ce dernier ne réagisse.
    if (response.status === 401 && session?.accessToken) {
      redirect("/api/auth/signin");
    }

    const body = await response.json().catch(() => undefined);
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
