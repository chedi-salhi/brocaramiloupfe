"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="text-sm">
      {label}
      <input
        {...props}
        className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
      />
    </label>
  );
}

export function RegisterForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    nom: "",
    prenom: "",
    adresse: "",
    numTelephone: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nom: form.nom,
          prenom: form.prenom,
          adresse: form.adresse,
          numTelephone: form.numTelephone || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw new Error(body?.message?.toString() ?? "Erreur lors de l'inscription");
      }

      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="animate-fade-in-scale rounded-xl border border-border bg-surface p-6 text-center flex flex-col gap-4">
        <p className="text-2xl">✓</p>
        <p className="font-medium">Compte créé avec succès</p>
        <p className="text-sm text-foreground/60 -mt-2">
          Un email de confirmation vient de t&apos;être envoyé — clique sur le lien pour pouvoir
          passer commande.
        </p>
        <Button
          onClick={() =>
            signIn(
              "keycloak",
              { callbackUrl: "/" },
              { login_hint: form.email },
            )
          }
        >
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field
        label="Email"
        type="email"
        required
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Prénom"
          required
          value={form.prenom}
          onChange={(e) => set("prenom", e.target.value)}
        />
        <Field
          label="Nom"
          required
          value={form.nom}
          onChange={(e) => set("nom", e.target.value)}
        />
      </div>
      <Field
        label="Adresse de livraison"
        required
        placeholder="12 rue de la Paix, Tunis"
        value={form.adresse}
        onChange={(e) => set("adresse", e.target.value)}
      />
      <Field
        label="Téléphone (optionnel)"
        value={form.numTelephone}
        onChange={(e) => set("numTelephone", e.target.value)}
      />
      <Field
        label="Mot de passe"
        type="password"
        required
        value={form.password}
        onChange={(e) => set("password", e.target.value)}
      />
      <Field
        label="Confirmer le mot de passe"
        type="password"
        required
        value={form.confirm}
        onChange={(e) => set("confirm", e.target.value)}
      />

      {error && <p className="text-sm text-red-600 animate-fade-in">{error}</p>}

      <Button disabled={status === "loading"} className="mt-2">
        {status === "loading" ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
