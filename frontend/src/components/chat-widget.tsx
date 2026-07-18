"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

interface Contact {
  idUtilisateur: number;
  nom: string;
  prenom: string | null;
}

interface Message {
  idMessage: number;
  expediteurId: number;
  destinataireId: number | null;
  contenu: string;
  createdAt: string;
}

// Bulle de chat flottante pour client/livreur : discussion directe avec
// l'admin (identifié via GET /messages/contact). Même namespace Socket.io
// que côté admin (ChatGateway /chat), donc les messages arrivent en direct
// des deux côtés.
export function ChatWidget() {
  const { data: session, status } = useSession();
  const roles = session?.roles ?? [];
  // Réservé au client/livreur : l'admin a sa propre page /admin/messages,
  // et un visiteur non connecté n'a personne d'identifié à qui écrire.
  const shouldShow = status === "authenticated" && (roles.includes("client") || roles.includes("livreur"));
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldShow) return;
    api<Contact>("/messages/contact").then(setContact).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow || !session?.accessToken) return;
    const socket = createSocket("/chat", session.accessToken);
    socketRef.current = socket;

    socket.on("message:new", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.idMessage === msg.idMessage)) return prev;
        return [...prev, msg];
      });
      setOpen((isOpen) => {
        if (!isOpen) setUnread((n) => n + 1);
        return isOpen;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken]);

  useEffect(() => {
    if (!contact) return;
    api<Message[]>(`/messages/thread/${contact.idUtilisateur}`).then((msgs) => {
      setMessages(msgs);
      window.dispatchEvent(new Event("messages-read"));
    });
    // Se redéclenche à l'ouverture (pas juste au premier contact connu) pour
    // que les nouveaux messages reçus pendant que la bulle est fermée soient
    // bien marqués lus quand l'utilisateur rouvre la conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.idUtilisateur, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  function send() {
    if (!draft.trim() || !socketRef.current || !contact) return;
    socketRef.current.emit("message:send", {
      contenu: draft,
      destinataireId: contact.idUtilisateur,
    });
    setDraft("");
  }

  if (!contact) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 h-96 rounded-xl border border-border bg-surface shadow-xl flex flex-col animate-fade-in-scale overflow-hidden">
          <div className="bg-ink text-white px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {contact.prenom} {contact.nom} · Support
            </span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.length === 0 && (
              <p className="text-sm text-foreground/50 text-center mt-4">
                Écris ton premier message !
              </p>
            )}
            {messages.map((m) => {
              const mine = m.expediteurId !== contact.idUtilisateur;
              return (
                <div
                  key={m.idMessage}
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "self-end bg-brand text-white"
                      : "self-start bg-surface-muted text-foreground"
                  }`}
                >
                  {m.contenu}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-2 flex gap-2">
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
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-14 w-14 rounded-full bg-brand text-white shadow-lg flex items-center justify-center text-xl hover:bg-brand-dark transition-colors"
        aria-label="Ouvrir le chat"
      >
        💬
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center animate-fade-in-scale">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
