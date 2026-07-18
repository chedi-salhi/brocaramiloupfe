"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useUpload } from "@/hooks/use-upload";
import { resolveMediaUrl } from "@/lib/media";
import type { Annonce } from "@/lib/types";
import { Button } from "@/components/ui/button";

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function AnnouncementForm({
  annonce,
  onDone,
}: {
  annonce?: Annonce;
  onDone: () => void;
}) {
  const api = useApi();
  const upload = useUpload();
  const router = useRouter();

  const [titre, setTitre] = useState(annonce?.titre ?? "");
  const [description, setDescription] = useState(annonce?.description ?? "");
  const [mediaUrl, setMediaUrl] = useState(annonce?.mediaUrl ?? "");
  const [typeMedia, setTypeMedia] = useState(annonce?.typeMedia ?? "image");
  const [dateDebut, setDateDebut] = useState(
    annonce ? toDateInput(annonce.dateDebut) : new Date().toISOString().slice(0, 10),
  );
  const [dateFin, setDateFin] = useState(annonce ? toDateInput(annonce.dateFin) : "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await upload(file);
      setMediaUrl(url);
      setTypeMedia(file.type.startsWith("video") ? "video" : "image");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      titre,
      description,
      typeMedia,
      mediaUrl,
      dateDebut: new Date(dateDebut).toISOString(),
      dateFin: new Date(dateFin).toISOString(),
    };

    try {
      if (annonce) {
        await api(`/announcements/${annonce.idAnnonce}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/announcements", { method: "POST", body: JSON.stringify(payload) });
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  }

  const preview = resolveMediaUrl(mediaUrl);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-lg bg-surface-muted overflow-hidden flex items-center justify-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-foreground/40">Média</span>
          )}
        </div>
        <label className="text-sm flex-1">
          Image / vidéo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="block w-full text-sm mt-1"
          />
          {uploading && <span className="text-xs text-foreground/50">Envoi...</span>}
        </label>
      </div>

      <label className="text-sm">
        Titre
        <input
          required
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </label>

      <label className="text-sm">
        Description
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Date de début
          <input
            required
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </label>
        <label className="text-sm">
          Date de fin
          <input
            required
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-full border border-border rounded-md p-2 mt-1 bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 animate-fade-in">{error}</p>}

      <Button disabled={loading || uploading || !mediaUrl} className="mt-2">
        {loading ? "Enregistrement..." : annonce ? "Enregistrer" : "Créer l'annonce"}
      </Button>
    </form>
  );
}
