import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaiementAnnulePage from "./page";

const apiMock = vi.fn();
const pushMock = vi.fn();
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
  useRouter: () => ({ push: pushMock }),
}));

// Couvre l'annulation sans stock/panier à restaurer (voir OrdersService.cancel
// et OrdersService.create, 22/07/2026) : PATCH /orders/:id/cancel se contente
// de marquer ANNULEE puisque rien n'a jamais été consommé côté EN_LIGNE non
// payé. Couvre aussi la même course que /paiement/retour (session pas
// forcément hydratée juste après le rechargement complet de page renvoyé par
// PayPal) : les boutons doivent rester désactivés tant que sessionStatus
// vaut "loading".
describe("PaiementAnnulePage", () => {
  beforeEach(() => {
    apiMock.mockReset();
    pushMock.mockReset();
    sessionStatus = "authenticated";
    searchParams = new URLSearchParams({ commandeId: "42" });
  });

  it("désactive les deux boutons tant que la session n'est pas encore chargée", () => {
    sessionStatus = "loading";
    render(<PaiementAnnulePage />);

    expect(screen.getByRole("button", { name: "Réessayer le paiement" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler la commande" })).toBeDisabled();
  });

  it("relance le paiement PayPal au clic sur Réessayer", async () => {
    apiMock.mockResolvedValue({ approvalUrl: "https://paypal.example/approve/1" });
    render(<PaiementAnnulePage />);

    await userEvent.click(screen.getByRole("button", { name: "Réessayer le paiement" }));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith("/payments/42/initiate", { method: "POST" }),
    );
  });

  it("affiche une erreur si la relance du paiement échoue", async () => {
    apiMock.mockRejectedValue(new Error("Erreur API 500 : boom"));
    render(<PaiementAnnulePage />);

    await userEvent.click(screen.getByRole("button", { name: "Réessayer le paiement" }));

    await waitFor(() => expect(screen.getByText("Erreur API 500 : boom")).toBeInTheDocument());
  });

  it("annule la commande au clic et affiche que le panier est resté intact", async () => {
    apiMock.mockResolvedValue(undefined);
    render(<PaiementAnnulePage />);

    await userEvent.click(screen.getByRole("button", { name: "Annuler la commande" }));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith("/orders/42/cancel", { method: "PATCH" }),
    );
    expect(screen.getByText("Commande annulée")).toBeInTheDocument();
    expect(screen.getByText("Tes articles sont toujours dans ton panier.")).toBeInTheDocument();
  });

  it("ramène au panier depuis l'écran de confirmation d'annulation", async () => {
    apiMock.mockResolvedValue(undefined);
    render(<PaiementAnnulePage />);
    await userEvent.click(screen.getByRole("button", { name: "Annuler la commande" }));
    await waitFor(() => expect(screen.getByText("Commande annulée")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Voir mon panier" }));

    expect(pushMock).toHaveBeenCalledWith("/panier");
  });

  it("affiche une erreur si l'annulation échoue et reste sur l'écran normal", async () => {
    apiMock.mockRejectedValue(new Error("Erreur API 500 : boom"));
    render(<PaiementAnnulePage />);

    await userEvent.click(screen.getByRole("button", { name: "Annuler la commande" }));

    await waitFor(() => expect(screen.getByText("Erreur API 500 : boom")).toBeInTheDocument());
    expect(screen.queryByText("Commande annulée")).not.toBeInTheDocument();
  });

  it("commandeId manquant : aucun bouton d'action affiché", () => {
    searchParams = new URLSearchParams();
    render(<PaiementAnnulePage />);

    expect(
      screen.queryByRole("button", { name: "Réessayer le paiement" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler la commande" })).not.toBeInTheDocument();
  });
});
