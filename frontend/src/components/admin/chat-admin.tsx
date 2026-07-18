"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

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
  createdAt: string;
}

export function ChatAdmin({ contacts }: { contacts: Contact[] }) {
  const { data: session } = useSession();
  const api = useApi();
  const [selected, setSelected] = useState<Contact | null>(contacts[0] ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Connexion socket unique, tant que l'admin est sur cette page.
  useEffect(() => {
    if (!session?.accessToken) return;
    const socket = createSocket("/chat", session.accessToken);
    socketRef.current = socket;

    socket.on("message:new", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.idMessage === msg.idMessage)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
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
      window.dispatchEvent(new Event("messages-read"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.idUtilisateur, broadcastMode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!draft.trim() || !socketRef.current) return;
    if (broadcastMode) {
      socketRef.current.emit("message:send", { contenu: draft, broadcast: true });
    } else if (selected) {
      socketRef.current.emit("message:send", {
        contenu: draft,
        destinataireId: selected.idUtilisateur,
      });
    }
    setDraft("");
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
                : "hover:bg-surface-muted"
            }`}
          >
            <span className="block truncate">
              {c.prenom} {c.nom}
            </span>
            <span className="text-xs text-foreground/50">{c.role?.name}</span>
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
                <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-foreground/40"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
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
