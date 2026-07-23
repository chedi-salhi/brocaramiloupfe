import { test, expect } from "@playwright/test";

// Couvre la fonctionnalité "favoris pour visiteur, même logique que le
// panier" : aucune connexion requise, l'identité est un jeton de session
// anonyme stocké en localStorage (voir hooks/use-api.ts,
// lib/session-token.ts). Chaque run de test démarre avec un localStorage
// vide (nouveau contexte Playwright), donc un nouveau jeton visiteur à
// chaque fois — pas d'état partagé avec les autres specs.
test.describe("Visiteur — panier et favoris sans compte", () => {
  test("ajoute un produit au panier et aux favoris depuis le catalogue", async ({ page }) => {
    await page.goto("/");

    const firstCard = page.getByTestId("product-card").first();
    await expect(firstCard).toBeVisible();
    const nomProduit = (await firstCard.locator("h2").innerText()).trim();

    await firstCard.getByTestId("add-to-cart-button").click();
    await expect(firstCard.getByTestId("add-to-cart-button")).toHaveText("✓ Ajouté");

    await firstCard.getByTestId("favorite-button").click();
    await expect(firstCard.getByTestId("favorite-button")).toHaveAttribute("aria-pressed", "true");

    await page.goto("/panier");
    await expect(page.getByText(nomProduit)).toBeVisible();

    await page.goto("/favoris");
    // getByText(nomProduit) est ambigu ici : ProductCard affiche le nom à la
    // fois dans le <h2> et, si la description du produit est identique au
    // nom (arrive avec certains produits saisis à la main côté admin), dans
    // le <p> de description aussi — strict mode violation (2 éléments
    // matchés). On cible explicitement le titre du produit plutôt qu'un
    // texte générique.
    await expect(
      page.getByTestId("product-card").getByRole("heading", { name: nomProduit }),
    ).toBeVisible();
  });
});
