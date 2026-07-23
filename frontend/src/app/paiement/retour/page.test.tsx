import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PaiementRetourPage from "./page";

const apiMock = vi.fn();
let sessionStatus: "loading" | "authenticated" | "unauthenticated" = "authenticated";
let searchParams = new URLSearchParams({ commandeId: "42" });

vi.mock("@/hooks/use-api", () => ({
  useApi: () => apiMock,
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: sessionStatus }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));
// Le vrai <Link> de l'App Router s'appuie sur un contexte router mounté que
// ce test ne fournit pas (on ne mocke que useSearchParams côté
// next/navigation) — un composant minimal suffit ici, seul le href importe.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Régression du 22-23/07/2026 : cette page appelait /payments/:id/capture
// avant que useSession() ait fini de charger (PayPal ramène ici via un
// rechargement complet de page, pas une navigation client-side) — l'appel
// partait sans token, 401 "Token manquant" côté backend. Couvre aussi
// l'invariant panier/stock : un paiement refusé ne doit jamais laisser
// penser que quoi que ce soit a été perdu côté panier.
describe("PaiementRetourPage", () => {
  beforeEach(() => {
    apiMock.mockReset();
    sessionStatus = "authenticated";
    searchParams = new URLSearchParams({ commandeId: "42" });
  });

  it("attend que la session soit chargée avant de capturer le paiement", () => {
    sessionStatus = "loading";
    render(<PaiementRetourPage />);

    expect(screen.getByText("Confirmation du paiement en cours...")).toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("capture le paiement une fois authentifié et affiche la confirmation si SUCCESS", async () => {
    apiMock.mockResolvedValue({ statut: "SUCCESS" });
    render(<PaiementRetourPage />);

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith("/payments/42/capture", { method: "POST" }),
    );
    await waitFor(() => expect(screen.getByText("Paiement confirmé")).toBeInTheDocument());
  });

  it("affiche un message d'échec précisant que le panier reste intact si PayPal ne renvoie pas SUCCESS", async () => {
    apiMock.mockResolvedValue({ statut: "FAILED" });
    render(<PaiementRetourPage />);

    await waitFor(() =>
      expect(screen.getByText(/tes articles sont toujours dans ton panier/i)).toBeInTheDocument(),
    );
  });

  it("affiche l'erreur renvoyée par l'API si la capture échoue techniquement", async () => {
    apiMock.mockRejectedValue(new Error("Erreur API 500 : boom"));
    render(<PaiementRetourPage />);

    await waitFor(() => expect(screen.getByText("Erreur API 500 : boom")).toBeInTheDocument());
  });

  it("commandeId manquant dans le lien de retour : erreur immédiate, aucun appel API", () => {
    searchParams = new URLSearchParams();
    render(<PaiementRetourPage />);

    expect(screen.getByText("Commande introuvable dans le lien de retour.")).toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("session expirée pendant le paiement : message dédié, aucun appel API", () => {
    sessionStatus = "unauthenticated";
    render(<PaiementRetourPage />);

    expect(screen.getByText(/Ta session a expiré pendant le paiement/)).toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });
});
