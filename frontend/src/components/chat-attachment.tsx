"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { resolveMediaUrl } from "@/lib/media";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type AttachmentKind = "IMAGE" | "VIDEO" | "FICHIER";

export interface Attachment {
  url: string;
  type: AttachmentKind;
  name: string;
}

// Champs de pièce jointe présents sur un message reçu du backend.
export interface MessageAttachmentFields {
  attachmentType?: "TEXTE" | AttachmentKind;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

// Charge utile à fusionner dans l'événement Socket.io "message:send".
export function attachmentPayload(attachment: Attachment | null) {
  if (!attachment) return {};
  return {
    attachmentUrl: attachment.url,
    attachmentType: attachment.type,
    attachmentName: attachment.name,
  };
}

// Bouton 📎 : envoie le fichier choisi (image, vidéo ou PDF) vers
// POST /uploads/message puis remonte l'Attachment au composant parent, qui
// l'inclut dans le prochain "message:send".
export function AttachmentButton({
  attachment,
  onChange,
}: {
  attachment: Attachment | null;
  onChange: (a: Attachment | null) => void;
}) {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/uploads/message`, {
        method: "POST",
        headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => undefined);
        throw new Error(body?.message?.toString() ?? "Échec de l'envoi du fichier");
      }
      onChange((await response.json()) as Attachment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi du fichier");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {(attachment || error) && (
        <div className="flex items-center gap-2 text-xs">
          {attachment && (
            <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-2 py-1 max-w-[200px]">
              <span className="truncate">
                {attachment.type === "IMAGE" ? "🖼️" : attachment.type === "VIDEO" ? "🎞️" : "📄"}{" "}
                {attachment.name}
              </span>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-foreground/60 hover:text-foreground"
                aria-label="Retirer la pièce jointe"
              >
                ✕
              </button>
            </span>
          )}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-border px-2 py-2 text-sm hover:bg-surface-muted disabled:opacity-50"
        aria-label="Joindre un fichier"
        title="Joindre une image, une vidéo ou un PDF"
      >
        {uploading ? "…" : "📎"}
      </button>
    </div>
  );
}

// Affichage d'une pièce jointe dans une bulle de message.
export function MessageAttachment({ message }: { message: MessageAttachmentFields }) {
  const url = resolveMediaUrl(message.attachmentUrl);
  if (!url || !message.attachmentType || message.attachmentType === "TEXTE") return null;

  if (message.attachmentType === "IMAGE") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={message.attachmentName ?? "Image"} className="mt-1 max-h-48 rounded-md" />
      </a>
    );
  }
  if (message.attachmentType === "VIDEO") {
    return <video src={url} controls className="mt-1 max-h-48 rounded-md" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-block underline break-all"
    >
      📄 {message.attachmentName ?? "Document PDF"}
    </a>
  );
}
