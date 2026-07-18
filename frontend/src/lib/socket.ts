import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

// Un client Socket.io par namespace ("/chat" ou "/tracking"), authentifié
// avec le même access token Keycloak que les appels REST. À appeler
// uniquement côté client (composants "use client"), jamais côté serveur.
export function createSocket(namespace: "/chat" | "/tracking", accessToken: string): Socket {
  return io(`${SOCKET_URL}${namespace}`, {
    auth: { token: accessToken },
    autoConnect: true,
  });
}
