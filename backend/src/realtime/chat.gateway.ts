import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AttachmentType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { KeycloakTokenService } from '../common/keycloak-token.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ALLOWED_ORIGINS } from '../common/cors-origins';

interface SendMessagePayload {
  destinataireId?: number;
  contenu?: string;
  broadcast?: boolean;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
}

const ATTACHMENT_TYPES: string[] = [AttachmentType.IMAGE, AttachmentType.VIDEO, AttachmentType.FICHIER];
// Seules les URLs produites par POST /uploads/message (Cloudinary) sont
// acceptées : empêche d'injecter une URL arbitraire via la websocket.
const ATTACHMENT_URL_PREFIX = 'https://res.cloudinary.com/';

function extractAttachment(payload: SendMessagePayload) {
  const valid =
    typeof payload.attachmentUrl === 'string' &&
    payload.attachmentUrl.startsWith(ATTACHMENT_URL_PREFIX) &&
    typeof payload.attachmentType === 'string' &&
    ATTACHMENT_TYPES.includes(payload.attachmentType);
  if (!valid) return null;
  return {
    attachmentUrl: payload.attachmentUrl as string,
    attachmentType: payload.attachmentType as AttachmentType,
    attachmentName: payload.attachmentName?.toString().slice(0, 200) ?? null,
  };
}

// Namespace unique pour toute la messagerie (client<->admin, livreur<->admin).
// Chaque socket rejoint une room "user:<idUtilisateur>" à la connexion, ce qui
// permet de cibler un destinataire précis sans garder de map de sockets à la main.
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
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
      // Les messages reçus pendant que l'utilisateur était hors ligne passent
      // à "livré" (double coche grise chez l'expéditeur) dès sa connexion.
      await this.markDelivered(utilisateur.idUtilisateur);
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
    if (!tokenUser || !expediteurId || !payload) return;

    const contenu = (payload.contenu ?? '').toString();
    const attachment = extractAttachment(payload);
    // Un message doit contenir du texte, une pièce jointe, ou les deux.
    if (!contenu.trim() && !attachment) return;

    if (payload.broadcast) {
      if (!tokenUser.roles.includes('admin')) return;

      const message = await this.prisma.message.create({
        data: { expediteurId, contenu, isBroadcast: true, ...attachment },
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
        contenu,
        ...attachment,
      },
    });

    // Destinataire connecté (au moins une socket dans sa room) => livré tout de suite.
    const online = await this.server.in(`user:${payload.destinataireId}`).fetchSockets();
    const delivered =
      online.length > 0
        ? await this.prisma.message.update({
            where: { idMessage: message.idMessage },
            data: { deliveredAt: new Date() },
          })
        : message;

    this.server.to(`user:${payload.destinataireId}`).emit('message:new', delivered);
    this.server.to(`user:${expediteurId}`).emit('message:new', delivered);
  }

  // Le client signale que la conversation avec `contactId` est ouverte à l'écran
  // (ou qu'un message vient d'y arriver) : les messages de ce contact passent à "lu".
  @SubscribeMessage('message:read')
  async handleRead(@ConnectedSocket() client: Socket, @MessageBody() payload: { contactId?: number }) {
    const moi: number | undefined = client.data.utilisateurId;
    if (!moi || !payload?.contactId) return;
    await this.markThreadRead(moi, Number(payload.contactId));
  }

  // Appelée aussi par MessagesService.getThread (ouverture de l'historique en REST).
  async markThreadRead(lecteurId: number, expediteurId: number) {
    const now = new Date();
    const pending = await this.prisma.message.findMany({
      where: { expediteurId, destinataireId: lecteurId, isBroadcast: false, readAt: null },
      select: { idMessage: true },
    });
    if (pending.length === 0) return;
    const ids = pending.map((m) => m.idMessage);

    // Un message lu est forcément livré : on complète deliveredAt s'il manquait.
    await this.prisma.message.updateMany({
      where: { idMessage: { in: ids }, deliveredAt: null },
      data: { deliveredAt: now },
    });
    await this.prisma.message.updateMany({
      where: { idMessage: { in: ids } },
      data: { isRead: true, readAt: now },
    });

    this.server
      .to(`user:${expediteurId}`)
      .emit('message:status', { ids, status: 'READ', at: now.toISOString() });
  }

  private async markDelivered(destinataireId: number) {
    const now = new Date();
    const pending = await this.prisma.message.findMany({
      where: { destinataireId, isBroadcast: false, deliveredAt: null },
      select: { idMessage: true, expediteurId: true },
    });
    if (pending.length === 0) return;

    await this.prisma.message.updateMany({
      where: { idMessage: { in: pending.map((m) => m.idMessage) } },
      data: { deliveredAt: now },
    });

    const parExpediteur = new Map<number, number[]>();
    for (const m of pending) {
      parExpediteur.set(m.expediteurId, [...(parExpediteur.get(m.expediteurId) ?? []), m.idMessage]);
    }
    for (const [expediteurId, ids] of parExpediteur) {
      this.server
        .to(`user:${expediteurId}`)
        .emit('message:status', { ids, status: 'DELIVERED', at: now.toISOString() });
    }
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
