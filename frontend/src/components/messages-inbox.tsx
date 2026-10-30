"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { Commande } from "@/lib/types";
import { MessageTicks, applyStatus, emitRead, onStatus } from "@/components/message-status";
import { AttachmentButton, MessageAttachment, attachmentPayload, type Attachment } from "@/components/chat-attachment";

interface Contact {
  idUtilisateur: number;
  nom: string;
  prenom: string | null;
  label: string; // "Support" | "Livreur" | "Client"
}

interface Message {
  idMessage: number;
  expediteurId: number;
  destinataireId: number | null;
  contenu: string;
  attachmentType?: "TEXTE" | "IMAGE" | "VIDEO" | "FICHIER";
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

interface Annonce {
  idMessage: number;
  contenu: string;
  attachmentType?: "TEXTE" | "IMAGE" | "VIDEO" | "FICHIER";
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

const BROADCASTS = "broadcasts" as const;

// Boîte de messagerie complète pour client/livreur — jusqu'ici la seule option
// était la bulle flottante, reliée uniquement au support admin. Un client et
// son livreur assigné n'avaient nulle part où retrouver leur historique de
// conversation en dehors de la page de suivi d'UNE commande précise. Ici on
// liste tous les contacts pertinents (admin + toute personne croisée via une
// commande) comme le fait déjà ChatAdmin côté admin.
export function MessagesInbox() {
  const { data: session } = useSession();
  const roles = session?.roles ?? [];
  const isLivreur = roles.includes("livreur");
  const api = useApi();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | typeof BROADCASTS | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Non-lus : par contact (id -> nombre) et pour les annonces diffusées.
  const [unread, setUnread] = useState<Record<number, number>>({});
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0);
  const selectedRef = useRef<Contact | typeof BROADCASTS | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api<{ idUtilisateur: number; nom: string; prenom: string | null } | null>(
        "/messages/contact",
      ).catch(() => null),
      api<Commande[]>("/orders/mine").catch(() => []),
    ]).then(([support, commandes]) => {
      const derived = new Map<number, Contact>();

      if (support) {
        derived.set(support.idUtilisateur, {
          ...support,
          label: "Support",
        });
      }

      for (const commande of commandes) {
        const autre = isLivreur ? commande.utilisateur : commande.livreur;
        if (autre && !derived.has(autre.idUtilisateur)) {
          derived.set(autre.idUtilisateur, {
            idUtilisateur: autre.idUtilisateur,
            nom: autre.nom,
            prenom: autre.prenom,
            label: isLivreur ? "Client" : "Livreur",
          });
        }
      }

      const list = Array.from(derived.values());
      setContacts(list);
      setSelected(list[0] ?? null);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLivreur]);

  useEffect(() => {
    api<{ bySender: Record<number, number>; broadcasts: number }>("/messages/unread-by-sender")
      .then((r) => {
        // La conversation déjà ouverte (sélectionnée d'office au chargement) est lue : pas de pastille.
        const cur = selectedRef.current;
        const bySender = { ...r.bySender };
        if (cur && cur !== BROADCASTS) delete bySender[cur.idUtilisateur];
        setUnread(bySender);
        setUnreadBroadcasts(cur === BROADCASTS ? 0 : r.broadcasts);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const socket = createSocket("/chat", session.accessToken);
    socketRef.current = socket;

    socket.on("message:new", (msg: Message & { isBroadcast?: boolean }) => {
      const current = selectedRef.current;
      if (msg.isBroadcast) {
        setAnnonces((prev) => [{ ...msg }, ...prev]);
        if (current !== BROADCASTS) setUnreadBroadcasts((n) => n + 1);
        return;
      }
      const fromContact = current && current !== BROADCASTS ? msg.expediteurId === current.idUtilisateur : false;
      const toContact = current && current !== BROADCASTS ? msg.destinataireId === current.idUtilisateur : false;
      if (fromContact || toContact) {
        setMessages((prev) => {
          if (prev.some((m) => m.idMessage === msg.idMessage)) return prev;
          return [...prev, msg];
        });
      }
      if (fromContact) {
        emitRead(socket, msg.expediteurId); // conversation ouverte : lu tout de suite
      } else if (msg.expediteurId !== undefined && !toContact) {
        // Message d'un autre contact : on le signale dans la barre latérale.
        setUnread((u) => ({ ...u, [msg.expediteurId]: (u[msg.expediteurId] ?? 0) + 1 }));
      }
    });
    const offStatus = onStatus(socket, (ev) => setMessages((prev) => applyStatus(prev, ev)));

    return () => {
      offStatus();
      socket.disconnect();
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (selected === BROADCASTS) {
      api<Annonce[]>("/messages/broadcasts").then((msgs) => {
        setAnnonces(msgs);
        setUnreadBroadcasts(0);
        window.dispatchEvent(new Event("messages-read"));
      });
      return;
    }
    if (!selected) return;
    api<Message[]>(`/messages/thread/${selected.idUtilisateur}`).then((msgs) => {
      setMessages(msgs);
      setUnread((u) => ({ ...u, [selected.idUtilisateur]: 0 }));
      window.dispatchEvent(new Event("messages-read"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, annonces]);

  function send() {
    if ((!draft.trim() && !attachment) || !socketRef.current || !selected || selected === BROADCASTS) return;
    socketRef.current.emit("message:send", {
      contenu: draft,
      destinataireId: selected.idUtilisateur,
      ...attachmentPayload(attachment),
    });
    setDraft("");
    setAttachment(null);
  }

  if (loading) {
    return <p className="text-foreground/60">Chargement...</p>;
  }

  if (contacts.length === 0) {
    return (
      <p className="text-foreground/60">
        Aucun contact pour l&apos;instant — {isLivreur ? "une livraison" : "une commande"} doit
        d&apos;abord t&apos;être {isLivreur ? "assignée" : "livrée avec un livreur assigné"}.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 h-[600px]">
      <div className="border border-border rounded-lg bg-surface overflow-y-auto">
        <button
          onClick={() => setSelected(BROADCASTS)}
          className={`w-full text-left px-4 py-3 text-sm border-b border-border transition-colors ${
            selected === BROADCASTS ? "bg-brand/10 text-brand font-medium" : "hover:bg-surface-muted"
          }`}
        >
          <span className="flex items-center justify-between">
            <span className={unreadBroadcasts > 0 && selected !== BROADCASTS ? "font-bold" : ""}>📢 Annonces</span>
            {unreadBroadcasts > 0 && (
              <span className="ml-2 shrink-0 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center">
                {unreadBroadcasts}
              </span>
            )}
          </span>
        </button>
        {contacts.map((c) => (
          <button
            key={c.idUtilisateur}
            onClick={() => setSelected(c)}
            className={`w-full text-left px-4 py-3 text-sm border-b border-border last:border-b-0 transition-colors ${
              selected !== BROADCASTS && selected?.idUtilisateur === c.idUtilisateur
                ? "bg-brand/10 text-brand font-medium"
                : unread[c.idUtilisateur] > 0
                  ? "bg-brand/5 font-bold hover:bg-brand/10"
                  : "hover:bg-surface-muted"
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="block truncate">
                {c.prenom} {c.nom}
              </span>
            {unread[c.idUtilisateur] > 0 && (
              <span className="ml-2 shrink-0 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold flex items-center justify-center">
                {unread[c.idUtilisateur]}
              </span>
            )}
            </span>
            <span className="text-xs font-normal text-foreground/50">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="border border-border rounded-lg bg-surface flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {selected === BROADCASTS
            ? annonces.map((a) => (
                <div
                  key={a.idMessage}
                  className="max-w-[85%] self-start rounded-lg px-3 py-2 text-sm bg-surface-muted text-foreground"
                >
                  {a.contenu}
                  <MessageAttachment message={a} />
                  <div className="text-[10px] mt-1 text-foreground/40">
                    {new Date(a.createdAt).toLocaleString("fr-FR")}
                  </div>
                </div>
              ))
            : messages.map((m) => {
                // Déjà dans la branche "selected !== BROADCASTS" (voir le
                // ternaire ligne 184) : TypeScript narrowe `selected` à
                // `Contact | null` ici, un nouveau test contre BROADCASTS
                // serait une comparaison sans chevauchement (erreur TS2367).
                const mine = m.expediteurId !== selected?.idUtilisateur;
                return (
                  <div
                    key={m.idMessage}
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      mine
                        ? "self-end bg-brand text-white"
                        : "self-start bg-surface-muted text-foreground"
                    }`}
                  >
                    {m.contenu}
                    <MessageAttachment message={m} />
                    <div className={`text-[10px] mt-1 flex items-center ${mine ? "justify-end text-white/70" : "text-foreground/40"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {mine && <MessageTicks message={m} />}
                    </div>
                  </div>
                );
              })}
          <div ref={endRef} />
        </div>

        {selected !== BROADCASTS && (
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <AttachmentButton attachment={attachment} onChange={setAttachment} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Écrire un message..."
              className="flex-1 border border-border rounded-md p-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            <button
              onClick={send}
              className="bg-brand text-white rounded-md px-3 text-sm hover:bg-brand-dark transition-colors"
            >
              ➤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
