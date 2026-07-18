"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function ConnexionCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 flex flex-col items-center gap-4 text-center animate-fade-in-scale">
      <Logo size={48} />
      <h1 className="text-xl font-semibold">Content de te revoir</h1>
      <p className="text-sm text-foreground/60">
        Connecte-toi pour accéder à ton panier, tes commandes et tes favoris.
      </p>

      <Button className="w-full mt-2" onClick={() => signIn("keycloak", { callbackUrl: "/" })}>
        Se connecter
      </Button>

      <p className="text-sm text-foreground/60 mt-2">
        Pas encore client ?{" "}
        <Link href="/inscription" className="text-brand font-medium hover:underline">
          Inscris-toi !
        </Link>
      </p>
    </div>
  );
}
