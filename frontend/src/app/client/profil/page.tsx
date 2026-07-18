import { apiFetch } from "@/lib/api-client";
import type { Utilisateur } from "@/lib/types";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilPage() {
  const moi = await apiFetch<Utilisateur>("/auth/me");

  return (
    <div className="animate-fade-in max-w-md">
      <h1 className="text-xl font-semibold mb-4">Mon profil</h1>
      <p className="text-sm text-foreground/60 mb-6">
        {moi.prenom} {moi.nom} — {moi.email}
      </p>
      <ProfileForm utilisateur={moi} />
    </div>
  );
}
