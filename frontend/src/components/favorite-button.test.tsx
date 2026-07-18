import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoritesProvider } from "./favorites-provider";
import { FavoriteButton } from "./favorite-button";

const apiMock = vi.fn();
vi.mock("@/hooks/use-api", () => ({
  useApi: () => apiMock,
}));

// Ces tests couvrent le comportement le plus fragile du provider : le toggle
// optimiste et sa logique de rollback (voir favorites-provider.tsx). Le cas
// 409 est spécifiquement testé car c'est un piège classique : un double-clic
// rapide où le serveur dit "déjà favori" ne doit PAS annuler l'état affiché.
describe("FavoriteButton", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  async function renderButton(postImpl: () => Promise<unknown>) {
    apiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (path === "/favorites" && !options) return Promise.resolve([]);
      if (options?.method === "POST") return postImpl();
      return Promise.resolve(undefined);
    });

    render(
      <FavoritesProvider>
        <FavoriteButton produitId={1} />
      </FavoritesProvider>,
    );

    const button = await screen.findByRole("button");
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
    return button;
  }

  it("bascule en favori de façon optimiste et reste actif si l'appel réussit", async () => {
    const button = await renderButton(() => Promise.resolve(undefined));

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");

    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));
  });

  it("annule le toggle si l'appel échoue (erreur autre que 409)", async () => {
    // Promesse contrôlée à la main plutôt que Promise.reject(...) direct :
    // userEvent.click() traverse plusieurs micro-tâches en interne (simulation
    // réaliste des events pointerdown/pointerup/click), donc un rejet immédiat
    // peut déjà avoir déclenché le rollback avant que l'assertion "encore
    // optimiste" ne s'exécute (flaky). En gardant la promesse en attente
    // explicitement, la fenêtre "optimiste" est garantie observable.
    let rejectPost!: (err: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectPost = reject;
    });
    const button = await renderButton(() => pending);

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true"); // optimiste, appel encore en attente

    rejectPost(new Error("Erreur API 500 : boom"));
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false")); // rollback
  });

  it("ne fait pas de rollback si le serveur répond 409 (déjà favori)", async () => {
    const button = await renderButton(() =>
      Promise.reject(new Error("Erreur API 409 : déjà favori")),
    );

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");

    // Laisse le temps à la promesse rejetée de se propager avant de vérifier
    // qu'aucun rollback n'a eu lieu.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
