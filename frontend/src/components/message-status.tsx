"use client";

import type { Socket } from "socket.io-client";

// Champs de statut portés par un message direct (voir backend: Message.deliveredAt / readAt).
export interface MessageStatusFields {
  idMessage: number;
  deliveredAt?: string | null;
  readAt?: string | null;
}

// Événement serveur : { ids, status: "DELIVERED" | "READ", at }
export interface StatusEvent {
  ids: number[];
  status: "DELIVERED" | "READ";
  at: string;
}

// Applique un événement "message:status" à une liste de messages.
export function applyStatus<T extends MessageStatusFields>(list: T[], ev: StatusEvent): T[] {
  const ids = new Set(ev.ids);
  return list.map((m) => {
    if (!ids.has(m.idMessage)) return m;
    return ev.status === "READ"
      ? { ...m, deliveredAt: m.deliveredAt ?? ev.at, readAt: ev.at }
      : { ...m, deliveredAt: ev.at };
  });
}

// Abonne le socket aux changements de statut. Retourne la fonction de nettoyage.
export function onStatus(socket: Socket, handler: (ev: StatusEvent) => void) {
  socket.on("message:status", handler);
  return () => {
    socket.off("message:status", handler);
  };
}

// Prévient le serveur que la conversation avec ce contact est lue.
export function emitRead(socket: Socket | null, contactId: number) {
  socket?.emit("message:read", { contactId });
}

// Coches façon Facebook / WhatsApp, à afficher sur MES messages seulement :
//   ✓   envoyé (enregistré par le serveur)
//   ✓✓  gris : reçu par le destinataire (connecté)
//   ✓✓  bleu : lu
export function MessageTicks({ message }: { message: MessageStatusFields }) {
  const read = !!message.readAt;
  const delivered = !!message.deliveredAt || read;
  const hhmm = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  // Tooltip : heure de réception / de lecture (deliveredAt / readAt, posés par le serveur).
  const label = read
    ? `Lu à ${hhmm(message.readAt)}`
    : delivered
      ? `Reçu à ${hhmm(message.deliveredAt)}`
      : "Envoyé";
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center ml-1 select-none font-bold leading-none ${
        read ? "text-sky-300" : "text-white/60"
      }`}
    >
      {delivered ? (
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 6l3 3 6-7" />
          <path d="M7 8.5l1 .5 7-8" />
        </svg>
      ) : (
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 6l3 3 6-7" />
        </svg>
      )}
    </span>
  );
}
