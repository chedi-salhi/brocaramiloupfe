import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CartBadge } from "./cart-badge";
import type { Panier } from "@/lib/types";

const apiMock = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApi: () => apiMock,
}));

function panier(quantites: number[]): Panier {
  return {
    idPanier: 1,
    produits: quantites.map((quantite, i) => ({
      idPanierProduit: i,
      produitId: i,
      quantite,
      prixUnitaire: "1.00",
      produit: {} as Panier["produits"][number]["produit"],
    })),
  };
}

describe("CartBadge", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("ne rend rien si le panier est vide", async () => {
    apiMock.mockResolvedValue(panier([]));
    const { container } = render(<CartBadge />);
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/cart"));
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche la somme des quantités, pas le nombre de lignes", async () => {
    apiMock.mockResolvedValue(panier([2, 3]));
    render(<CartBadge />);
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument());
  });

  it('affiche "99+" au-delà de 99 articles', async () => {
    apiMock.mockResolvedValue(panier([150]));
    render(<CartBadge />);
    await waitFor(() => expect(screen.getByText("99+")).toBeInTheDocument());
  });

  it('se recale quand un composant déclenche l\'event "cart-updated"', async () => {
    apiMock.mockResolvedValue(panier([1]));
    render(<CartBadge />);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());

    apiMock.mockResolvedValue(panier([4]));
    window.dispatchEvent(new Event("cart-updated"));

    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
  });
});
