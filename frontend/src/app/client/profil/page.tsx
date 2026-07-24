import { apiFetch } from "@/lib/api-client";
import type { Utilisateur } from "@/lib/types";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function ProfilPage() {
  const moi = await apiFetch<Utilisateur>("/auth/me");

  return (
    <div className="animate-fade-in max-w-md flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold mb-4">Mon profil</h1>
        <p className="text-sm text-foreground/60 mb-6">
          {moi.prenom} {moi.nom} — {moi.email}
        </p>
        <ProfileForm utilisateur={moi} />
      </div>
      <ChangePasswordForm />
    </div>
  );
}
