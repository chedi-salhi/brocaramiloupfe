"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { MessageTicks, applyStatus, emitRead, onStatus } from "@/components/message-status";
import { AttachmentButton, MessageAttachment, attachmentPayload, type Attachment } from "@/components/chat-attachment";

interface Contact {
  idUtilisateur: number;
  nom: string;
  prenom: string | null;
  role?: { name: string } | null;
}

interface Message {
  idMessage: number;
  expediteurId: number;
  destinataireId: number | null;
  isBroadcast: boolean;
  contenu: string;
  attachmentType?: "TEXTE" | "IMAGE" | "VIDEO" | "FICHIER";
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export function ChatAdmin({ contacts }: { contacts: Contact[] }) {
  const { data: session } = useSession();
  const api = useApi();
  const [selected, setSelected] = useState<Contact | null>(contacts[0] ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [unread, setUnread] = useState<Record<number, number>>({});
  const selectedIdRef = useRef<number | null>(null);
  const broadcastRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedIdRef.current = selected?.idUtilisateur ?? null;
    broadcastRef.current = broadcastMode;
  }, [selected, broadcastMode]);

  useEffect(() => {
    api<{ bySender: Record<number, number> }>("/messages/unread-by-sender")
      .then((r) => {
        const bySender = { ...r.bySender };
        if (selectedIdRef.current !== null) delete bySender[selectedIdRef.current];
        setUnread(bySender);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connexion socket unique, tant que l'admin est sur cette page.
  useEffect(() => {
    if (!session?.accessToken) return;
    const socket = createSocket("/chat", session.accessToken);
    socketRef.current = socket;

    socket.on("message:new", (msg: Message) => {
      const currentId = selectedIdRef.current;
      // Le message appartient-il à la conversation affichée ?
      const inView = broadcastRef.current
        ? msg.isBroadcast
        : !msg.isBroadcast && currentId !== null && (msg.expediteurId === currentId || msg.destinataireId === currentId);
      if (inView) {
        setMessages((prev) => {
          if (prev.some((m) => m.idMessage === msg.idMessage)) return prev;
          return [...prev, msg];
        });
      }
      if (!msg.isBroadcast && msg.expediteurId === currentId && !broadcastRef.current) {
        emitRead(socket, msg.expediteurId); // conversation ouverte : lu tout de suite
      } else if (!msg.isBroadcast && msg.destinataireId !== currentId) {
        // Message reçu d'un autre contact : pastille dans la liste.
        setUnread((u) => ({ ...u, [msg.expediteurId]: (u[msg.expediteurId] ?? 0) + 1 }));
      }
    });
    const offStatus = onStatus(socket, (ev) => setMessages((prev) => applyStatus(prev, ev)));

    return () => {
      offStatus();
      socket.disconnect();
    };
  }, [session?.accessToken]);

  // Historique à chaque changement de destinataire.
  useEffect(() => {
    if (broadcastMode) {
      api<Message[]>("/messages/broadcasts").then((msgs) => {
        setMessages([...msgs].reverse());
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
  }, [selected?.idUtilisateur, broadcastMode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if ((!draft.trim() && !attachment) || !socketRef.current) return;
    if (broadcastMode) {
      socketRef.current.emit("message:send", {
        contenu: draft,
        broadcast: true,
        ...attachmentPayload(attachment),
      });
    } else if (selected) {
      socketRef.current.emit("message:send", {
        contenu: draft,
        destinataireId: selected.idUtilisateur,
        ...attachmentPayload(attachment),
      });
    }
    setDraft("");
    setAttachment(null);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 h-[600px]">
      <div className="border border-border rounded-lg bg-surface overflow-y-auto">
        <button
          onClick={() => setBroadcastMode(true)}
          className={`w-full text-left px-4 py-3 text-sm border-b border-border transition-colors ${
            broadcastMode ? "bg-brand/10 text-brand font-medium" : "hover:bg-surface-muted"
          }`}
        >
          📢 Diffusion générale
        </button>
        {contacts.map((c) => (
          <button
            key={c.idUtilisateur}
            onClick={() => {
              setSelected(c);
              setBroadcastMode(false);
            }}
            className={`w-full text-left px-4 py-3 text-sm border-b border-border last:border-b-0 transition-colors ${
              !broadcastMode && selected?.idUtilisateur === c.idUtilisateur
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
            <span className="text-xs font-normal text-foreground/50">{c.role?.name}</span>
          </button>
        ))}
      </div>

      <div className="border border-border rounded-lg bg-surface flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.expediteurId !== selected?.idUtilisateur || broadcastMode;
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
                  {mine && !m.isBroadcast && <MessageTicks message={m} />}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2 items-end">
          <AttachmentButton attachment={attachment} onChange={setAttachment} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={broadcastMode ? "Message à tous les utilisateurs..." : "Écrire un message..."}
            className="flex-1 border border-border rounded-md p-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <Button onClick={send}>Envoyer</Button>
        </div>
      </div>
    </div>
  );
}
