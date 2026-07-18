import { apiFetch } from "@/lib/api-client";
import type { Utilisateur } from "@/lib/types";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export default async function AdminParametresPage() {
  const moi = await apiFetch<Utilisateur>("/auth/me");

  return (
    <div className="animate-fade-in max-w-md">
      <h1 className="text-xl font-semibold mb-4">Paramètres du compte</h1>
      <AdminSettingsForm utilisateur={moi} />
    </div>
  );
}
