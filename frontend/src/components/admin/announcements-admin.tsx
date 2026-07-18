"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Annonce } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/media";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export function AnnouncementsAdmin({ annonces }: { annonces: Annonce[] }) {
  const api = useApi();
  const router = useRouter();
  const [editing, setEditing] = useState<Annonce | "new" | null>(null);

  async function handleDelete(id: number) {
    await api(`/announcements/${id}`, { method: "DELETE" });
    router.refresh();
  }

  // Date.now() est impur : appelé directement pendant le rendu, sa valeur
  // change à chaque re-render, ce que React considère invalide (règle de
  // pureté). Un instantané pris une seule fois via l'initialiseur paresseux
  // de useState suffit ici (page admin, pas besoin d'un "maintenant" qui
  // tique en direct).
  const [now] = useState(() => Date.now());

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Annonces</h1>
        <Button onClick={() => setEditing("new")}>+ Nouvelle annonce</Button>
      </div>

      {annonces.length === 0 ? (
        <p className="text-foreground/60">Aucune annonce pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 stagger">
          {annonces.map((annonce) => {
            const preview = resolveMediaUrl(annonce.mediaUrl);
            const active =
              now >= new Date(annonce.dateDebut).getTime() &&
              now <= new Date(annonce.dateFin).getTime();
            return (
              <div
                key={annonce.idAnnonce}
                className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-surface-muted">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{annonce.titre}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        active
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                          : "bg-surface-muted text-foreground/50"
                      }`}
                    >
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/60 line-clamp-2">{annonce.description}</p>
                  <p className="text-xs text-foreground/40 mt-auto pt-2">
                    {new Date(annonce.dateDebut).toLocaleDateString("fr-FR")} →{" "}
                    {new Date(annonce.dateFin).toLocaleDateString("fr-FR")}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setEditing(annonce)}>
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDelete(annonce.idAnnonce)}
                    >
                      Suppr.
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nouvelle annonce" : "Modifier l'annonce"}
      >
        <AnnouncementForm
          annonce={editing === "new" ? undefined : (editing ?? undefined)}
          onDone={() => setEditing(null)}
        />
      </Modal>
    </div>
  );
}
