import { apiFetch } from "@/lib/api-client";
import type { Annonce } from "@/lib/types";
import { AnnouncementsAdmin } from "@/components/admin/announcements-admin";

export default async function AdminAnnoncesPage() {
  const annonces = await apiFetch<Annonce[]>("/announcements/all");
  return <AnnouncementsAdmin annonces={annonces} />;
}
