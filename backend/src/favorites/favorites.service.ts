import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../common/session.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

interface FavoriOwner {
  utilisateurId?: number;
  sessionId?: number;
}

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  async list(tokenUser?: AuthenticatedUser, sessionToken?: string) {
    const owner = await this.resolveOwner(tokenUser, sessionToken);
    return this.prisma.favori.findMany({
      where: owner.utilisateurId
        ? { utilisateurId: owner.utilisateurId }
        : { sessionId: owner.sessionId },
      include: { produit: true },
    });
  }

  async add(produitId: number, tokenUser?: AuthenticatedUser, sessionToken?: string) {
    const produit = await this.prisma.produit.findUnique({ where: { idProduit: produitId } });
    if (!produit) {
      throw new NotFoundException(`Produit ${produitId} introuvable`);
    }

    const owner = await this.resolveOwner(tokenUser, sessionToken);

    const existing = owner.utilisateurId
      ? await this.prisma.favori.findUnique({
          where: { utilisateurId_produitId: { utilisateurId: owner.utilisateurId, produitId } },
        })
      : await this.prisma.favori.findUnique({
          where: { sessionId_produitId: { sessionId: owner.sessionId!, produitId } },
        });

    if (existing) {
      throw new ConflictException('Produit déjà en favoris');
    }

    return this.prisma.favori.create({
      data: { produitId, utilisateurId: owner.utilisateurId, sessionId: owner.sessionId },
    });
  }

  async remove(produitId: number, tokenUser?: AuthenticatedUser, sessionToken?: string) {
    const owner = await this.resolveOwner(tokenUser, sessionToken);
    await this.prisma.favori.deleteMany({
      where: owner.utilisateurId
        ? { utilisateurId: owner.utilisateurId, produitId }
        : { sessionId: owner.sessionId, produitId },
    });
    return { removed: true };
  }

  // Fusionne les favoris du visiteur (sessionToken) dans ceux du compte qui vient de
  // se connecter. En cas de doublon (même produit déjà en favori sur le compte), on
  // supprime simplement la ligne de session au lieu de créer un conflit d'unicité.
  private async mergeSessionIntoUser(sessionToken: string, utilisateurId: number) {
    const session = await this.prisma.session.findUnique({ where: { token: sessionToken } });
    if (!session) return;

    const sessionFavoris = await this.prisma.favori.findMany({
      where: { sessionId: session.idSession },
    });

    for (const favori of sessionFavoris) {
      const existing = await this.prisma.favori.findUnique({
        where: { utilisateurId_produitId: { utilisateurId, produitId: favori.produitId } },
      });

      if (existing) {
        await this.prisma.favori.delete({ where: { idFavori: favori.idFavori } });
      } else {
        await this.prisma.favori.update({
          where: { idFavori: favori.idFavori },
          data: { utilisateurId, sessionId: null },
        });
      }
    }
  }

  private async resolveOwner(tokenUser?: AuthenticatedUser, sessionToken?: string): Promise<FavoriOwner> {
    if (tokenUser) {
      const utilisateur = await this.authService.syncUser(tokenUser);
      if (sessionToken) {
        await this.mergeSessionIntoUser(sessionToken, utilisateur.idUtilisateur);
      }
      return { utilisateurId: utilisateur.idUtilisateur };
    }

    if (sessionToken) {
      const session = await this.sessionService.getOrCreate(sessionToken);
      return { sessionId: session.idSession };
    }

    throw new BadRequestException(
      'Connecte-toi ou fournis un en-tête x-session-token pour gérer les favoris',
    );
  }
}
