import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrdersAdmin } from "./orders-admin";
import type { Commande, Utilisateur } from "@/lib/types";

const apiMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApi: () => apiMock,
}));
vi.mock("@/hooks/use-invoice", () => ({
  useInvoice: () => ({ downloadInvoice: vi.fn(), printInvoice: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const livreurs: Utilisateur[] = [
  {
    idUtilisateur: 7,
    email: "livreur@test.com",
    nom: "Ben Ali",
    prenom: "Karim",
    adresse: null,
    numTelephone: null,
  },
];

function makeCommande(overrides: Partial<Commande> = {}): Commande {
  return {
    idCommande: 1,
    utilisateurId: 1,
    utilisateur: null,
    etat: "EN_ATTENTE",
    dateCommande: "2026-07-20T10:00:00.000Z",
    montantTotal: "50.00",
    livreurId: null,
    livreur: null,
    adresseLivraison: "12 rue de la Paix, Tunis",
    produits: [],
    historique: [],
    facture: null,
    paiement: null,
    ...overrides,
  };
}

// Couvre la règle métier ajoutée le 22/07/2026 (voir
// OrdersAdmin.isUnconfirmedEnLigne) : une commande EN_LIGNE dont le paiement
// n'est pas SUCCESS n'a jamais été confirmée par le client, donc elle est
// masquée par défaut de la liste — seul un toggle explicite la révèle, avec
// ses contrôles désactivés (sauf Annulée).
describe("OrdersAdmin", () => {
  beforeEach(() => {
    apiMock.mockReset();
    refreshMock.mockReset();
  });

  it("masque par défaut une commande EN_LIGNE non payée et affiche le toggle avec le bon compte", () => {
    const cash = makeCommande({
      idCommande: 1,
      paiement: {
        idPaiement: 1,
        montant: "50.00",
        methodePaiement: "A_LA_LIVRAISON",
        statut: "PENDING",
        confirmedById: null,
      },
    });
    const enLignePayee = makeCommande({
      idCommande: 2,
      paiement: {
        idPaiement: 2,
        montant: "30.00",
        methodePaiement: "EN_LIGNE",
        statut: "SUCCESS",
        confirmedById: null,
      },
    });
    const enLigneNonPayee = makeCommande({
      idCommande: 3,
      paiement: {
        idPaiement: 3,
        montant: "20.00",
        methodePaiement: "EN_LIGNE",
        statut: "PENDING",
        confirmedById: null,
      },
    });

    render(<OrdersAdmin commandes={[cash, enLignePayee, enLigneNonPayee]} livreurs={livreurs} />);

    expect(screen.getByTestId("admin-order-1")).toBeInTheDocument();
    expect(screen.getByTestId("admin-order-2")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-order-3")).not.toBeInTheDocument();
    expect(
      screen.getByText("1 paiement en ligne non confirmé masqué — afficher"),
    ).toBeInTheDocument();
  });

  it("accorde le pluriel quand plusieurs commandes sont masquées", () => {
    const commandes = [1, 2].map((id) =>
      makeCommande({
        idCommande: id,
        paiement: {
          idPaiement: id,
          montant: "20.00",
          methodePaiement: "EN_LIGNE",
          statut: "PENDING",
          confirmedById: null,
        },
      }),
    );

    render(<OrdersAdmin commandes={commandes} livreurs={livreurs} />);

    expect(
      screen.getByText("2 paiements en ligne non confirmés masqués — afficher"),
    ).toBeInTheDocument();
  });

  it("n'affiche pas de toggle si aucune commande n'est masquée", () => {
    const cash = makeCommande({
      paiement: {
        idPaiement: 1,
        montant: "50.00",
        methodePaiement: "A_LA_LIVRAISON",
        statut: "PENDING",
        confirmedById: null,
      },
    });

    render(<OrdersAdmin commandes={[cash]} livreurs={livreurs} />);

    expect(screen.queryByTestId("toggle-unconfirmed-orders")).not.toBeInTheDocument();
  });

  it("le toggle révèle la commande masquée avec bannière et contrôles désactivés (sauf Annulée)", async () => {
    const enLigneNonPayee = makeCommande({
      idCommande: 3,
      paiement: {
        idPaiement: 3,
        montant: "20.00",
        methodePaiement: "EN_LIGNE",
        statut: "PENDING",
        confirmedById: null,
      },
    });

    render(<OrdersAdmin commandes={[enLigneNonPayee]} livreurs={livreurs} />);

    await userEvent.click(screen.getByTestId("toggle-unconfirmed-orders"));

    const row = screen.getByTestId("admin-order-3");
    expect(row).toBeInTheDocument();
    expect(
      within(row).getByText(/Paiement en ligne non confirmé/),
    ).toBeInTheDocument();
    expect(within(row).getByRole("combobox")).toBeDisabled();
    expect(within(row).getByTestId("admin-status-EN_LIVRAISON-3")).toBeDisabled();
    expect(within(row).getByTestId("admin-status-LIVREE-3")).toBeDisabled();
    expect(within(row).getByTestId("admin-status-ANNULEE-3")).toBeEnabled();

    // Le libellé du toggle change une fois déplié.
    expect(
      screen.getByText("Masquer les paiements en ligne non confirmés"),
    ).toBeInTheDocument();
  });

  it("commande clôturée (Livrée/Annulée) : plus de <select> ni de boutons de statut", () => {
    const livree = makeCommande({
      idCommande: 4,
      etat: "LIVREE",
      livreurId: 7,
      livreur: { idUtilisateur: 7, nom: "Ben Ali", prenom: "Karim", numTelephone: null },
      paiement: {
        idPaiement: 4,
        montant: "50.00",
        methodePaiement: "A_LA_LIVRAISON",
        statut: "SUCCESS",
        confirmedById: 7,
      },
    });

    render(<OrdersAdmin commandes={[livree]} livreurs={livreurs} />);

    const row = screen.getByTestId("admin-order-4");
    expect(within(row).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(row).getByText("Statut définitif")).toBeInTheDocument();
    expect(within(row).getByText(/Livreur :/)).toBeInTheDocument();
  });
});
