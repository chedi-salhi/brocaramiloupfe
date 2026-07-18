import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

// Historique de lecture seule pour la messagerie (l'envoi se fait en direct
// via ChatGateway / Socket.io). Ouvert à tout utilisateur authentifié : le
// service ne renvoie jamais que les messages où l'appelant est participant
// (voir MessagesService.getThread), donc pas de fuite possible entre comptes.
@Controller('messages')
@UseGuards(KeycloakAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Le client/livreur ne connaît pas l'id de l'admin à qui écrire — on lui
  // donne le premier compte admin trouvé (cas d'un seul admin, suffisant ici).
  @Get('contact')
  getContact() {
    return this.messagesService.getSupportContact();
  }

  @Get('thread/:userId')
  getThread(@Param('userId', ParseIntPipe) userId: number, @CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getThread(user, userId);
  }

  @Get('broadcasts')
  getBroadcasts(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getBroadcasts(user);
  }

  // Badge de notification global (navbar), tous rôles confondus.
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.getUnreadCount(user);
  }
}
