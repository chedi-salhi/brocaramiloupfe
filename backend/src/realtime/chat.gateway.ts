import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { KeycloakTokenService } from '../common/keycloak-token.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

interface SendMessagePayload {
  destinataireId?: number;
  contenu: string;
  broadcast?: boolean;
}

// Namespace unique pour toute la messagerie (client<->admin, livreur<->admin).
// Chaque socket rejoint une room "user:<idUtilisateur>" à la connexion, ce qui
// permet de cibler un destinataire précis sans garder de map de sockets à la main.
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly tokenService: KeycloakTokenService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const tokenUser = await this.authenticate(client);
      const utilisateur = await this.authService.syncUser(tokenUser);
      client.data.user = tokenUser;
      client.data.utilisateurId = utilisateur.idUtilisateur;
      client.join(`user:${utilisateur.idUtilisateur}`);
    } catch {
      client.disconnect(true);
    }
  }

  // Un seul événement d'entrée : "broadcast" (réservé admin) envoie à tout le monde,
  // sinon "destinataireId" cible un utilisateur précis (client<->admin, livreur<->admin).
  @SubscribeMessage('message:send')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessagePayload) {
    const tokenUser: AuthenticatedUser = client.data.user;
    const expediteurId: number = client.data.utilisateurId;
    if (!tokenUser || !expediteurId || !payload?.contenu) return;

    if (payload.broadcast) {
      if (!tokenUser.roles.includes('admin')) return;

      const message = await this.prisma.message.create({
        data: { expediteurId, contenu: payload.contenu, isBroadcast: true },
      });

      const destinataires = await this.prisma.utilisateur.findMany({
        where: { idUtilisateur: { not: expediteurId } },
        select: { idUtilisateur: true },
      });
      await this.prisma.messageLecture.createMany({
        data: destinataires.map((d) => ({
          messageId: message.idMessage,
          utilisateurId: d.idUtilisateur,
        })),
      });

      this.server.emit('message:new', message);
      return;
    }

    if (!payload.destinataireId) return;

    const message = await this.prisma.message.create({
      data: {
        expediteurId,
        destinataireId: payload.destinataireId,
        contenu: payload.contenu,
      },
    });

    this.server.to(`user:${payload.destinataireId}`).emit('message:new', message);
    this.server.to(`user:${expediteurId}`).emit('message:new', message);
  }

  private async authenticate(client: Socket): Promise<AuthenticatedUser> {
    const authToken = client.handshake.auth?.token as string | undefined;
    const headerToken = (client.handshake.headers.authorization as string | undefined)?.replace(
      'Bearer ',
      '',
    );
    const token = authToken ?? headerToken;
    if (!token) {
      throw new Error('Token manquant');
    }
    return this.tokenService.verify(token);
  }
}
