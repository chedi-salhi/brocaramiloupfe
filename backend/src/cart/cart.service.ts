import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../common/session.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

interface CartOwner {
  utilisateurId?: number;
  sessionId?: number;
}

const PANIER_INCLUDE = { produits: { include: { produit: true } } } as const;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  async getPanier(tokenUser?: AuthenticatedUser, sessionToken?: string) {
    const owner = await this.resolveOwner(tokenUser, sessionToken);
    const panier = await this.findOrCreatePanier(owner);
    return this.prisma.panier.findUnique({
      where: { idPanier: panier.idPanier },
      include: PANIER_INCLUDE,
    });
  }

  async addItem(dto: AddToCartDto, tokenUser?: AuthenticatedUser, sessionToken?: string) {
    const produit = await this.prisma.produit.findUnique({ where: { idProduit: dto.produitId } });
    if (!produit || !produit.isAvailable) {
      throw new NotFoundException(`Produit ${dto.produitId} indisponible`);
    }

    const owner = await this.resolveOwner(tokenUser, sessionToken);
    const panier = await this.findOrCreatePanier(owner);

    const existingItem = await this.prisma.panierProduit.findFirst({
      where: { panierId: panier.idPanier, produitId: dto.produitId },
    });

    if (existingItem) {
      await this.prisma.panierProduit.update({
        where: { idPanierProduit: existingItem.idPanierProduit },
        data: { quantite: existingItem.quantite + dto.quantite },
      });
    } else {
      await this.prisma.panierProduit.create({
        data: {
          panierId: panier.idPanier,
          produitId: dto.produitId,
          quantite: dto.quantite,
          prixUnitaire: produit.prix,
        },
      });
    }

    return this.prisma.panier.findUnique({
      where: { idPanier: panier.idPanier },
      include: PANIER_INCLUDE,
    });
  }

  async updateItem(
    produitId: number,
    dto: UpdateCartItemDto,
    tokenUser?: AuthenticatedUser,
    sessionToken?: string,
  ) {
    const owner = await this.resolveOwner(tokenUser, sessionToken);
    const panier = await this.findOrCreatePanier(owner);

    const item = await this.prisma.panierProduit.findFirst({
      where: { panierId: panier.idPanier, produitId },
    });
    if (!item) {
      throw new NotFoundException('Produit absent du panier');
    }

    await this.prisma.panierProduit.update({
      where: { idPanierProduit: item.idPanierProduit },
      data: { quantite: dto.quantite },
    });

    return this.prisma.panier.findUnique({
      where: { idPanier: panier.idPanier },
      include: PANIER_INCLUDE,
    });
  }

  async removeItem(produitId: number, tokenUser?: AuthenticatedUser, sessionToken?: string) {
    const owner = await this.resolveOwner(tokenUser, sessionToken);
    const panier = await this.findOrCreatePanier(owner);

    await this.prisma.panierProduit.deleteMany({
      where: { panierId: panier.idPanier, produitId },
    });

    return this.prisma.panier.findUnique({
      where: { idPanier: panier.idPanier },
      include: PANIER_INCLUDE,
    });
  }

  // Fusionne le panier du visiteur (identifié par sessionToken) dans le panier du
  // compte qui vient de se connecter. Appelé automatiquement dès qu'une requête
  // panier arrive à la fois authentifiée ET avec un x-session-token encore présent.
  private async mergeSessionIntoUser(sessionToken: string, utilisateurId: number) {
    const session = await this.prisma.session.findUnique({ where: { token: sessionToken } });
    if (!session) return;

    const sessionPanier = await this.prisma.panier.findUnique({
      where: { sessionId: session.idSession },
      include: { produits: true },
    });
    if (!sessionPanier) return;

    const userPanier = await this.prisma.panier.findUnique({ where: { utilisateurId } });

    if (!userPanier) {
      await this.prisma.panier.update({
        where: { idPanier: sessionPanier.idPanier },
        data: { utilisateurId, sessionId: null },
      });
      return;
    }

    for (const item of sessionPanier.produits) {
      const existing = await this.prisma.panierProduit.findFirst({
        where: { panierId: userPanier.idPanier, produitId: item.produitId },
      });
      if (existing) {
        await this.prisma.panierProduit.update({
          where: { idPanierProduit: existing.idPanierProduit },
          data: { quantite: existing.quantite + item.quantite },
        });
      } else {
        await this.prisma.panierProduit.create({
          data: {
            panierId: userPanier.idPanier,
            produitId: item.produitId,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
          },
        });
      }
    }

    await this.prisma.panier.delete({ where: { idPanier: sessionPanier.idPanier } });
  }

  private async resolveOwner(tokenUser?: AuthenticatedUser, sessionToken?: string): Promise<CartOwner> {
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
      'Connecte-toi ou fournis un en-tête x-session-token pour gérer un panier',
    );
  }

  private async findOrCreatePanier(owner: CartOwner) {
    if (owner.utilisateurId) {
      const existing = await this.prisma.panier.findUnique({
        where: { utilisateurId: owner.utilisateurId },
      });
      if (existing) return existing;
      return this.prisma.panier.create({ data: { utilisateurId: owner.utilisateurId } });
    }

    const existing = await this.prisma.panier.findUnique({
      where: { sessionId: owner.sessionId },
    });
    if (existing) return existing;
    return this.prisma.panier.create({ data: { sessionId: owner.sessionId } });
  }
}
