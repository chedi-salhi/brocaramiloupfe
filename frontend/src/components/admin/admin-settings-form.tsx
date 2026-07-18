"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { Utilisateur } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminSettingsForm({ utilisateur }: { utilisateur: Utilisateur }) {
  const api = useApi();
  const router = useRouter();

  const [nom, setNom] = useState(utilisateur.nom ?? "");
  const [prenom, setPrenom] = useState(utilisateur.prenom ?? "");
  const [numTelephone, setNumTelephone] = useState(utilisateur.numTelephone ?? "");
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileStatus("loading");
    try {
      await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ nom, prenom, numTelephone }),
      });
      setProfileStatus("done");
      router.refresh();
      setTimeout(() => setProfileStatus("idle"), 1500);
    } catch {
      setProfileStatus("error");
    }
  }

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
    <div className="flex flex-col gap-6">
      <Card hoverable={false}>
        <h2 className="font-medium mb-3">Identité</h2>
        <p className="text-sm text-foreground/60 mb-4">
          {utilisateur.email}{" "}
          <span className="text-xs text-foreground/40">(identifiant de connexion, non modifiable ici)</span>
        </p>

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Prénom
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </label>
            <label className="text-sm">
              Nom
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </label>
          </div>

          <label className="text-sm">
            Téléphone
            <input
              value={numTelephone}
              onChange={(e) => setNumTelephone(e.target.value)}
              placeholder="+216 12 345 678"
              className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </label>

          <Button disabled={profileStatus === "loading"} className="mt-2 self-start">
            {profileStatus === "loading" && "Enregistrement..."}
            {profileStatus === "done" && "✓ Enregistré"}
            {profileStatus === "error" && "Erreur, réessaye"}
            {profileStatus === "idle" && "Enregistrer"}
          </Button>
        </form>
      </Card>

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
    </div>
  );
}
