"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Status = "loading" | "success" | "error";

// useSearchParams() force Next.js à passer cette page en rendu client pur
// au moment du build ("CSR bailout") — sans Suspense autour, next build
// échoue avec "useSearchParams() should be wrapped in a suspense boundary".
export default function VerifierEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-6 py-16">
          <Card hoverable={false} className="text-center">
            <p className="text-foreground/60">Chargement...</p>
          </Card>
        </div>
      }
    >
      <VerifierEmailContent />
    </Suspense>
  );
}

function VerifierEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  // État initial dérivé directement de la présence du token plutôt que fixé
  // dans l'effet : ce n'est pas un effet de bord (rien à synchroniser avec un
  // système externe), donc pas besoin d'un setState synchrone au montage.
  const [status, setStatus] = useState<Status>(() => (token ? "loading" : "error"));
  const [message, setMessage] = useState(() =>
    token ? "" : "Lien invalide : aucun jeton de vérification trouvé.",
  );

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message ?? "Échec de la vérification");
        setStatus("success");
        setMessage(`Adresse ${body.email} confirmée avec succès !`);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Lien invalide ou expiré");
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <Card hoverable={false} className="text-center animate-fade-in">
        {status === "loading" && <p className="text-foreground/60">Vérification en cours...</p>}

        {status === "success" && (
          <>
            <p className="text-4xl mb-3">✅</p>
            <h1 className="text-lg font-semibold mb-2">Email confirmé</h1>
            <p className="text-sm text-foreground/60 mb-6">{message}</p>
            <Link href="/">
              <Button>Aller au catalogue</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-4xl mb-3">⚠️</p>
            <h1 className="text-lg font-semibold mb-2">Vérification impossible</h1>
            <p className="text-sm text-foreground/60 mb-6">{message}</p>
            <Link href="/client/profil">
              <Button variant="outline">Redemander un lien depuis mon profil</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
