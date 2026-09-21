// Liste unique des origines autorisées, partagée entre le CORS HTTP
// (main.ts) et les deux gateways Socket.io (chat.gateway.ts,
// tracking.gateway.ts). Avant ce fichier, chaque gateway codait en dur
// 'http://localhost:3000' uniquement : ça cassait la messagerie et le
// tracking de commande en mode tout-Docker (front servi sur
// http://keycloak:3000, voir RECOVERY.md) puisque le handshake Socket.io
// est alors rejeté par CORS avant même d'atteindre handleConnection.
export const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://keycloak:3000',
];
