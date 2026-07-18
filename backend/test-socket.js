// Script de test manuel pour les gateways realtime.
// Usage : node test-socket.js <TOKEN_JWT>
// Se connecte au namespace /tracking et affiche les événements "order:update" reçus.
// Dans un autre terminal, appelle PATCH /orders/:id/status pour déclencher une notif.

const { io } = require('socket.io-client');

const token = process.argv[2];
if (!token) {
  console.error('Usage: node test-socket.js <TOKEN_JWT>');
  process.exit(1);
}

const socket = io('http://localhost:3001/tracking', {
  auth: { token },
});

socket.on('connect', () => console.log('Connecté :', socket.id));
socket.on('connect_error', (err) => console.error('Erreur de connexion :', err.message));
socket.on('order:update', (commande) => console.log('order:update reçu ->', commande));
socket.on('disconnect', () => console.log('Déconnecté'));
