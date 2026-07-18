import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // Historique direct entre l'admin connecté et un utilisateur donné — pas de
  // notion de "conversation" en base, on filtre juste les messages non-diffusés
  // entre ces deux idUtilisateur, dans les deux sens.
  // Effet de bord volontaire : ouvrir le fil marque les messages reçus comme lus
  // (pas de bouton "marquer comme lu" séparé côté front, ouvrir == lire).
  async getThread(tokenUser: AuthenticatedUser, autreUtilisateurId: number) {
    const moi = await this.authService.syncUser(tokenUser);

    const messages = await this.prisma.message.findMany({
      where: {
        isBroadcast: false,
        OR: [
          { expediteurId: moi.idUtilisateur, destinataireId: autreUtilisateurId },
          { expediteurId: autreUtilisateurId, destinataireId: moi.idUtilisateur },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.message.updateMany({
      where: {
        expediteurId: autreUtilisateurId,
        destinataireId: moi.idUtilisateur,
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages;
  }

  // Nombre de messages non lus pour l'utilisateur connecté : directs +
  // diffusions (broadcasts), tous roles confondus (client/livreur/admin).
  async getUnreadCount(tokenUser: AuthenticatedUser) {
    const moi = await this.authService.syncUser(tokenUser);

    const [direct, broadcasts] = await Promise.all([
      this.prisma.message.count({
        where: { destinataireId: moi.idUtilisateur, isRead: false },
      }),
      this.prisma.messageLecture.count({
        where: { utilisateurId: moi.idUtilisateur, isRead: false },
      }),
    ]);

    return { count: direct + broadcasts };
  }

  // Le contact "support" affiché côté client/livreur : le premier compte admin
  // trouvé (un seul admin dans ce projet, pas besoin de plus pour l'instant).
  async getSupportContact() {
    return this.prisma.utilisateur.findFirst({
      where: { role: { name: 'admin' } },
      select: { idUtilisateur: true, nom: true, prenom: true },
      orderBy: { idUtilisateur: 'asc' },
    });
  }

  // Annonces diffusées à tout le monde (isBroadcast = true), les plus récentes en premier.
  // Consulter la liste marque aussi les diffusions comme lues pour l'appelant.
  async getBroadcasts(tokenUser: AuthenticatedUser) {
    const moi = await this.authService.syncUser(tokenUser);

    const broadcasts = await this.prisma.message.findMany({
      where: { isBroadcast: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    await this.prisma.messageLecture.updateMany({
      where: { utilisateurId: moi.idUtilisateur, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return broadcasts;
  }
}
