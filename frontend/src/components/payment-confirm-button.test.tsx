import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentConfirmButton } from "./payment-confirm-button";
import type { Commande } from "@/lib/types";

const apiMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApi: () => apiMock,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

function makeCommande(overrides: Partial<Commande> = {}): Commande {
  return {
    idCommande: 42,
    paiement: null,
    ...overrides,
  } as Commande;
}

// Règles de visibilité du bouton (voir le commentaire dans
// payment-confirm-button.tsx) : rien à confirmer pour le paiement en ligne
// (circuit automatique), rien à cliquer une fois déjà encaissé.
describe("PaymentConfirmButton", () => {
  beforeEach(() => {
    apiMock.mockReset();
    refreshMock.mockReset();
  });

  it("ne rend rien s'il n'y a pas de paiement associé", () => {
    const { container } = render(<PaymentConfirmButton commande={makeCommande()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien pour un paiement en ligne (rien à confirmer côté livreur)", () => {
    const { container } = render(
      <PaymentConfirmButton
        commande={makeCommande({
          paiement: {
            idPaiement: 1,
            montant: "10.00",
            methodePaiement: "EN_LIGNE",
            statut: "PENDING",
            confirmedById: null,
          },
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche la confirmation sans bouton si déjà encaissé", () => {
    render(
      <PaymentConfirmButton
        commande={makeCommande({
          paiement: {
            idPaiement: 1,
            montant: "10.00",
            methodePaiement: "A_LA_LIVRAISON",
            statut: "SUCCESS",
            confirmedById: 5,
          },
        })}
      />,
    );
    expect(screen.getByText(/Paiement encaissé et confirmé/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("confirme le paiement cash au clic et rafraîchit la page", async () => {
    apiMock.mockResolvedValue(undefined);
    render(
      <PaymentConfirmButton
        commande={makeCommande({
          paiement: {
            idPaiement: 1,
            montant: "10.00",
            methodePaiement: "A_LA_LIVRAISON",
            statut: "PENDING",
            confirmedById: null,
          },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(apiMock).toHaveBeenCalledWith("/payments/42/confirm-cash", { method: "PATCH" });
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("affiche une erreur si la confirmation échoue et ne rafraîchit pas", async () => {
    apiMock.mockRejectedValue(new Error("Erreur API 500 : boom"));
    render(
      <PaymentConfirmButton
        commande={makeCommande({
          paiement: {
            idPaiement: 1,
            montant: "10.00",
            methodePaiement: "A_LA_LIVRAISON",
            statut: "PENDING",
            confirmedById: null,
          },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Erreur API 500 : boom")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
