import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { KeycloakTokenService } from '../common/keycloak-token.service';

// Namespace dédié au suivi de commande : pousse une notification au client concerné
// dès qu'un admin/livreur change l'état d'une commande (appelé par
// OrdersService.updateStatus via notifyOrderUpdate — voir orders.module.ts).
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class TrackingGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: KeycloakTokenService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authToken = client.handshake.auth?.token as string | undefined;
      const headerToken = (client.handshake.headers.authorization as string | undefined)?.replace(
        'Bearer ',
        '',
      );
      const token = authToken ?? headerToken;
      if (!token) throw new Error('Token manquant');

      const tokenUser = await this.tokenService.verify(token);
      const utilisateur = await this.authService.syncUser(tokenUser);
      client.join(`user:${utilisateur.idUtilisateur}`);
    } catch {
      client.disconnect(true);
    }
  }

  notifyOrderUpdate(utilisateurId: number, commande: unknown) {
    this.server.to(`user:${utilisateurId}`).emit('order:update', commande);
  }
}
