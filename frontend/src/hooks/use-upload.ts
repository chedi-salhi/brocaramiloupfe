"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Upload de fichier (image produit/annonce) : POST /uploads en multipart,
// séparé de useApi() qui force toujours Content-Type: application/json.
export function useUpload() {
  const { data: session } = useSession();

  return useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/uploads`, {
        method: "POST",
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw new Error(body?.message?.toString() ?? "Échec de l'upload");
      }

      const { url } = await response.json();
      return url as string;
    },
    // Voir use-api.ts : le React Compiler infère une dépendance sur `session`
    // entier plutôt que sur `.accessToken` seul.
    [session],
  );
}
