"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { createSocket } from "@/lib/socket";

interface IncomingMessage {
  expediteurId: number;
  destinataireId: number | null;
  isBroadcast: boolean;
}

// Cloche de notification pour TOUS les rôles connectés (client, livreur, admin) :
// compteur de messages non lus (directs + diffusions), backé par les colonnes
// Message.isRead / MessageLecture.isRead (voir GET /messages/unread-count).
// Se recale en direct via le socket /chat, et se remet à zéro dès que
// l'utilisateur ouvre son point de messagerie (page /messages ou
// /admin/messages, qui appellent déjà getThread/getBroadcasts côté backend).
export function NotificationBell() {
  const { data: session, status } = useSession();
  const roles = session?.roles ?? [];
  const api = useApi();
  const [count, setCount] = useState(0);
  const [myId, setMyId] = useState<number | null>(null);

  const isAdmin = roles.includes("admin");
  // La bulle flottante (ChatWidget) ne parle qu'à l'admin support — pour un
  // client/livreur, une notification peut aussi venir de l'autre côté (client
  // <-> livreur assigné), donc on renvoie vers la vraie boîte de réception
  // plutôt que d'ouvrir cette bulle limitée.
  const target = isAdmin ? "/admin/messages" : "/messages";

  function refresh() {
    api<{ count: number }>("/messages/unread-count")
      .then((res) => setCount(res.count))
      .catch(() => {});
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    refresh();
    // idUtilisateur interne : ne correspond pas au "sub" Keycloak, on le
    // récupère via /auth/me pour pouvoir filtrer les events socket ci-dessous.
    api<{ idUtilisateur: number }>("/auth/me")
      .then((me) => setMyId(me.idUtilisateur))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Les composants de chat (bulle client/livreur, chat admin) déclenchent cet
  // event dès qu'ils ouvrent un fil (ce qui marque les messages lus côté
  // backend) — on recale juste le compteur plutôt que de dupliquer la logique.
  useEffect(() => {
    window.addEventListener("messages-read", refresh);
    return () => window.removeEventListener("messages-read", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;
    const socket = createSocket("/chat", session.accessToken);

    socket.on("message:new", (msg: IncomingMessage) => {
      if (myId !== null && msg.expediteurId === myId) return; // mes propres envois ne comptent pas
      if (msg.isBroadcast || msg.destinataireId === myId) {
        setCount((n) => n + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [status, session?.accessToken, myId]);

  if (status !== "authenticated") return null;

  if (count === 0) {
    return (
      <Link
        href={target}
        className="relative text-sm font-medium text-foreground/70 hover:text-foreground"
        aria-label="Messages"
      >
        💬
      </Link>
    );
  }

  const bell = (
    <span className="relative text-sm">
      💬
      <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center animate-fade-in-scale">
        {count > 9 ? "9+" : count}
      </span>
    </span>
  );

  return (
    <Link href={target} className="relative" aria-label={`${count} message(s) non lu(s)`}>
      {bell}
    </Link>
  );
}
