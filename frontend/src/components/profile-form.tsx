"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import type { Utilisateur } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function ProfileForm({ utilisateur }: { utilisateur: Utilisateur }) {
  const api = useApi();
  const router = useRouter();
  const [adresse, setAdresse] = useState(utilisateur.adresse ?? "");
  const [numTelephone, setNumTelephone] = useState(utilisateur.numTelephone ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent">("idle");

  async function handleResend() {
    setResendStatus("loading");
    try {
      await api("/auth/resend-verification", { method: "POST" });
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ adresse, numTelephone }),
      });
      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {utilisateur.isVerified === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900 p-3 mb-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            ⚠️ Email non confirmé — vérifie ta boîte mail pour pouvoir passer commande.
          </p>
          <Button
            type="button"
            variant="outline"
            className="text-xs px-2.5 py-1 shrink-0"
            disabled={resendStatus !== "idle"}
            onClick={handleResend}
          >
            {resendStatus === "loading" && "Envoi..."}
            {resendStatus === "sent" && "✓ Email envoyé"}
            {resendStatus === "idle" && "Renvoyer le lien"}
          </Button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3"
      >
      <label className="text-sm">
        Adresse de livraison par défaut
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="12 rue de la Paix, Tunis"
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </label>

      <label className="text-sm">
        Téléphone
        <input
          value={numTelephone}
          onChange={(e) => setNumTelephone(e.target.value)}
          placeholder="+216 12 345 678"
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </label>

        <Button disabled={status === "loading"} className="mt-2 self-start">
          {status === "loading" && "Enregistrement..."}
          {status === "done" && "✓ Enregistré"}
          {status === "error" && "Erreur, réessaye"}
          {status === "idle" && "Enregistrer"}
        </Button>
      </form>
    </>
  );
}
