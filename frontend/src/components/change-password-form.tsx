"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Utilisé par tous les rôles (client, livreur, admin) : PATCH /auth/me est
// déjà générique côté backend (voir AuthService.updateProfile), il n'agit
// que sur l'utilisateur connecté (son propre keycloakId), jamais sur un
// autre compte — pas besoin de droits admin pour changer son propre mot de
// passe.
export function ChangePasswordForm() {
  const api = useApi();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordStatus("loading");
    try {
      await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ newPassword }),
      });
      setPasswordStatus("done");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatus("idle"), 1500);
    } catch (err) {
      setPasswordStatus("error");
      setPasswordError(err instanceof Error ? err.message : "Erreur lors du changement");
    }
  }

  return (
    <Card hoverable={false}>
      <h2 className="font-medium mb-3">Changer le mot de passe</h2>

      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
        <label className="text-sm">
          Nouveau mot de passe
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </label>

        <label className="text-sm">
          Confirmer le mot de passe
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </label>

        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

        <Button disabled={passwordStatus === "loading"} variant="outline" className="mt-2 self-start">
          {passwordStatus === "loading" && "Modification..."}
          {passwordStatus === "done" && "✓ Mot de passe changé"}
          {passwordStatus === "idle" && "Changer le mot de passe"}
          {passwordStatus === "error" && !passwordError && "Erreur, réessaye"}
        </Button>
      </form>
    </Card>
  );
}
