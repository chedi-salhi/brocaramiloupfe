// Test manuel du namespace /chat.
// Usage : node test-chat.js <TOKEN> [destinataireId]
// Se connecte, écoute "message:new", et si un destinataireId est fourni, envoie un message direct.

const { io } = require('socket.io-client');

const token = process.argv[2];
const destinataireId = process.argv[3] ? Number(process.argv[3]) : undefined;

if (!token) {
  console.error('Usage: node test-chat.js <TOKEN> [destinataireId]');
  process.exit(1);
}

const socket = io('http://localhost:3001/chat', { auth: { token } });

socket.on('connect', () => {
  console.log('Connecté :', socket.id);
  if (destinataireId) {
    setTimeout(() => {
      socket.emit('message:send', { destinataireId, contenu: 'Bonjour, ceci est un test' });
      console.log('Message envoyé à', destinataireId);
    }, 500);
  }
});
socket.on('connect_error', (err) => console.error('Erreur de connexion :', err.message));
socket.on('message:new', (msg) => console.log('message:new reçu ->', msg));
socket.on('disconnect', () => console.log('Déconnecté'));
