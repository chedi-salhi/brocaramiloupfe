"use client";

import { useSession } from "next-auth/react";
import { MessagesInbox } from "@/components/messages-inbox";

// Route volontairement générique (pas /client/messages ni /livreur/messages) :
// même composant pour les deux rôles, qui adapte lui-même le libellé des
// contacts. L'admin a sa propre page dédiée (/admin/messages).
export default function MessagesPage() {
  const { data: session, status } = useSession();
  const roles = session?.roles ?? [];
  const allowed = roles.includes("client") || roles.includes("livreur");

  if (status === "loading") {
    return <p className="text-foreground/60 max-w-5xl mx-auto px-6 py-10">Chargement...</p>;
  }

  if (!allowed) {
    return (
      <p className="text-foreground/60 max-w-5xl mx-auto px-6 py-10">
        Cette messagerie est réservée aux comptes client et livreur.
      </p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 animate-fade-in">
      <h1 className="text-xl font-semibold mb-4">Messages</h1>
      <MessagesInbox />
    </div>
  );
}
