import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSessionToken } from "./session-token";

const STORAGE_KEY = "brocaramilou_session_token";

describe("getSessionToken", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("génère un jeton et le persiste en localStorage au premier appel", () => {
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    const token = getSessionToken();

    expect(token).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(token);
  });

  it("renvoie le même jeton à chaque appel (persistance)", () => {
    const first = getSessionToken();
    const second = getSessionToken();

    expect(second).toBe(first);
  });

  it("renvoie un UUID v4 bien formé quand crypto.randomUUID est disponible (contexte sécurisé)", () => {
    const token = getSessionToken();
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  // Régression : crypto.randomUUID() n'existe pas sur http://keycloak:3000
  // (contexte non sécurisé du mode tout-Docker, voir RECOVERY.md) — ça
  // jetait "crypto.randomUUID is not a function" et cassait tout appel API
  // tant qu'aucun jeton n'existait déjà en localStorage.
  it("retombe sur crypto.getRandomValues() si randomUUID est indisponible, sans planter", () => {
    const originalRandomUUID = crypto.randomUUID;
    // @ts-expect-error simulation d'un contexte non sécurisé (pas de randomUUID)
    delete crypto.randomUUID;

    try {
      const token = getSessionToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      crypto.randomUUID = originalRandomUUID;
    }
  });

  it("ne plante pas et ne touche pas localStorage hors navigateur (SSR)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulation d'un rendu serveur (pas de `window`)
    delete globalThis.window;

    try {
      expect(getSessionToken()).toBe("");
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
