import { apiFetch } from "@/lib/api-client";
import type { Commande, Utilisateur } from "@/lib/types";
import { OrdersAdmin } from "@/components/admin/orders-admin";

interface UtilisateurAvecRole extends Utilisateur {
  role?: { name: string } | null;
}

export default async function AdminCommandesPage() {
  const [commandes, utilisateurs] = await Promise.all([
    apiFetch<Commande[]>("/orders"),
    apiFetch<UtilisateurAvecRole[]>("/users"),
  ]);

  const livreurs = utilisateurs.filter((u) => u.role?.name === "livreur");

  return <OrdersAdmin commandes={commandes} livreurs={livreurs} />;
}
