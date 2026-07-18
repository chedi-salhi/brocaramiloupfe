import { apiFetch } from "@/lib/api-client";
import type { Utilisateur } from "@/lib/types";
import { UsersAdmin } from "@/components/admin/users-admin";

export default async function AdminUtilisateursPage() {
  const utilisateurs = await apiFetch<Utilisateur[]>("/users");
  return <UsersAdmin utilisateurs={utilisateurs} />;
}
