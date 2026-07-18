"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

interface Message {
  idMessage: number;
  expediteurId: number;
  destinataireId: number | null;
  contenu: string;
  createdAt: string;
}

// Chat direct avec le livreur assigné à UNE commande précise (distinct de la
// bulle flottante ChatWidget, qui elle est réservée au support admin). Même
// backend (namespace /chat, endpoint /messages/thread/:id), juste ciblé sur
// le livreurId de la commande plutôt que sur le premier admin trouvé.
export function LivreurChat({
  livreurId,
  livreurNom,
}: {
  livreurId: number;
  livreurNom: string;
}) {
  const { data: session } = useSession();
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api<Message[]>(`/messages/thread/${livreurId}`)
      .then((msgs) => {
        setMessages(msgs);
        window.dispatchEvent(new Event("messages-read"));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, livreurId]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const socket = createSocket("/chat", session.accessToken);
    socketRef.current = socket;

    socket.on("message:new", (msg: Message) => {
      if (msg.expediteurId !== livreurId && msg.destinataireId !== livreurId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.idMessage === msg.idMessage)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.accessToken, livreurId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send() {
    if (!draft.trim() || !socketRef.current) return;
    socketRef.current.emit("message:send", {
      contenu: draft,
      destinataireId: livreurId,
    });
    setDraft("");
  }

  return (
    <div>
      <Button variant="outline" onClick={() => setOpen((o) => !o)}>
        💬 Envoyer un message à {livreurNom}
      </Button>

      {open && (
        <div className="mt-3 w-full h-72 rounded-xl border border-border bg-surface flex flex-col overflow-hidden animate-fade-in-scale">
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.length === 0 && (
              <p className="text-sm text-foreground/50 text-center mt-4">
                Écris ton premier message à {livreurNom} !
              </p>
            )}
            {messages.map((m) => {
              const mine = m.expediteurId !== livreurId;
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
    </div>
  );
}
