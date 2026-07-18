"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// GET /invoices/:commandeId/download renvoie un PDF binaire et exige un Bearer
// token — impossible à ouvrir via un simple <a href>. On le récupère en blob
// ici, puis on déclenche soit un téléchargement, soit l'impression directe.
export function useInvoice() {
  const { data: session } = useSession();

  const fetchPdf = useCallback(
    async (commandeId: number): Promise<Blob> => {
      const response = await fetch(`${API_URL}/invoices/${commandeId}/download`, {
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
      });
      if (!response.ok) {
        throw new Error("Impossible de récupérer la facture");
      }
      return response.blob();
    },
    // Voir use-api.ts : le React Compiler infère une dépendance sur `session`
    // entier plutôt que sur `.accessToken` seul.
    [session],
  );

  const downloadInvoice = useCallback(
    async (commandeId: number, numeroFacture?: string) => {
      const blob = await fetchPdf(commandeId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${numeroFacture ?? commandeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [fetchPdf],
  );

  const printInvoice = useCallback(
    async (commandeId: number) => {
      const blob = await fetchPdf(commandeId);
      const url = URL.createObjectURL(blob);

      // Iframe cachée : plus fiable qu'un nouvel onglet, dont le bloqueur de
      // popups peut empêcher l'ouverture et dont print() dépend du focus.
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };

      // Nettoyage après un délai raisonnable pour laisser le dialogue s'ouvrir.
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60_000);
    },
    [fetchPdf],
  );

  return { downloadInvoice, printInvoice };
}
