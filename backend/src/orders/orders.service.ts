import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EtatCommande, MethodePaiement, StatutPaiement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AssignLivreurDto } from './dto/assign-livreur.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { TrackingGateway } from '../realtime/tracking.gateway';
import { EmailService } from '../email/email.service';

const ORDER_INCLUDE = {
  produits: { include: { produit: true } },
  paiement: true,
  facture: true,
  historique: { orderBy: { createdAt: 'asc' as const } },
  // Nom/téléphone seulement : le client n'a pas besoin de l'email ou de l'adresse du livreur.
  livreur: {
    select: { idUtilisateur: true, nom: true, prenom: true, numTelephone: true },
  },
  // Idem côté client : utile pour l'admin (liste des commandes) et le livreur
  // (savoir à qui il livre) sans exposer email/mot de passe.
  utilisateur: {
    select: { idUtilisateur: true, nom: true, prenom: true, numTelephone: true },
  },
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly trackingGateway: TrackingGateway,
    private readonly emailService: EmailService,
  ) {}

  // Passe une commande à partir du panier actuel du client connecté : snapshot des
  // prix, décrément du stock, création du paiement (PENDING), vidage du panier.
  // Tout se fait dans une transaction pour rester cohérent en cas d'échec.
  async create(tokenUser: AuthenticatedUser, dto: CreateOrderDto) {
    const utilisateur = await this.authService.syncUser(tokenUser);

    if (!utilisateur.isVerified) {
      throw new ForbiddenException(
        "Merci de confirmer ton adresse email avant de passer commande (vérifie ta boîte mail, ou redemande le lien depuis ton profil)",
      );
    }

    const panier = await this.prisma.panier.findUnique({
      where: { utilisateurId: utilisateur.idUtilisateur },
      include: { produits: { include: { produit: true } } },
    });

    if (!panier || panier.produits.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }

    for (const item of panier.produits) {
      if (!item.produit.isAvailable || item.produit.stock < item.quantite) {
        throw new BadRequestException(`Stock insuffisant pour ${item.produit.nom}`);
      }
    }

    const montantTotal = panier.produits.reduce(
      (total, item) => total + Number(item.prixUnitaire.toString()) * item.quantite,
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const commande = await tx.commande.create({
        data: {
          utilisateurId: utilisateur.idUtilisateur,
          adresseLivraison: dto.adresseLivraison,
          montantTotal,
          produits: {
            create: panier.produits.map((item) => ({
              produitId: item.produitId,
              quantite: item.quantite,
              prixUnitaire: item.prixUnitaire,
            })),
          },
          historique: { create: { etat: EtatCommande.EN_ATTENTE } },
          paiement: {
            create: {
              montant: montantTotal,
              methodePaiement: dto.methodePaiement,
            },
          },
        },
        include: ORDER_INCLUDE,
      });

      for (const item of panier.produits) {
        await tx.produit.update({
          where: { idProduit: item.produitId },
          data: { stock: { decrement: item.quantite } },
        });
      }

      await tx.panierProduit.deleteMany({ where: { panierId: panier.idPanier } });

      return commande;
    });
  }

  // Le client voit ses propres commandes, le livreur voit celles qui lui sont assignées.
  async findMine(tokenUser: AuthenticatedUser) {
    const utilisateur = await this.authService.syncUser(tokenUser);

    if (tokenUser.roles.includes('livreur')) {
      return this.prisma.commande.findMany({
        where: { livreurId: utilisateur.idUtilisateur },
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.commande.findMany({
      where: { utilisateurId: utilisateur.idUtilisateur },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.commande.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, tokenUser: AuthenticatedUser) {
    const commande = await this.prisma.commande.findUnique({
      where: { idCommande: id },
      include: ORDER_INCLUDE,
    });
    if (!commande) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    const utilisateur = await this.authService.syncUser(tokenUser);
    const isOwner = commande.utilisateurId === utilisateur.idUtilisateur;
    const isLivreur = commande.livreurId === utilisateur.idUtilisateur;
    const isAdmin = tokenUser.roles.includes('admin');

    if (!isOwner && !isLivreur && !isAdmin) {
      throw new ForbiddenException("Vous n'avez pas accès à cette commande");
    }

    return commande;
  }

  // "Mettre à jour une commande" : seule l'adresse est modifiable, et seulement avant
  // expédition (paiement à la livraison) ou avant paiement (paiement en ligne).
  async update(id: number, tokenUser: AuthenticatedUser, dto: UpdateOrderDto) {
    const commande = await this.getOwnedCommande(id, tokenUser);
    this.assertModifiable(commande);

    return this.prisma.commande.update({
      where: { idCommande: id },
      data: { adresseLivraison: dto.adresseLivraison },
      include: ORDER_INCLUDE,
    });
  }

  // Annulation par le client, seulement tant que la commande n'a pas été expédiée.
  // Le stock réservé est restitué.
  async cancel(id: number, tokenUser: AuthenticatedUser) {
    const commande = await this.getOwnedCommande(id, tokenUser);

    if (commande.etat !== EtatCommande.EN_ATTENTE) {
      throw new BadRequestException('Cette commande ne peut plus être annulée');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of commande.produits) {
        await tx.produit.update({
          where: { idProduit: item.produitId },
          data: { stock: { increment: item.quantite } },
        });
      }

      return tx.commande.update({
        where: { idCommande: id },
        data: {
          etat: EtatCommande.ANNULEE,
          historique: { create: { etat: EtatCommande.ANNULEE } },
        },
        include: ORDER_INCLUDE,
      });
    });
  }

  // Admin : assigne un livreur à une commande.
  async assignLivreur(id: number, dto: AssignLivreurDto) {
    const commande = await this.prisma.commande.findUnique({ where: { idCommande: id } });
    if (!commande) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    const livreur = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur: dto.livreurId },
      include: { role: true },
    });
    if (!livreur || livreur.role?.name !== 'livreur') {
      throw new BadRequestException(`Utilisateur ${dto.livreurId} n'est pas un livreur`);
    }

    return this.prisma.commande.update({
      where: { idCommande: id },
      data: { livreurId: dto.livreurId, assignedAt: new Date() },
      include: ORDER_INCLUDE,
    });
  }

  // Admin ou livreur assigné : fait progresser l'état de livraison.
  async updateStatus(id: number, tokenUser: AuthenticatedUser, dto: UpdateStatusDto) {
    const commande = await this.prisma.commande.findUnique({ where: { idCommande: id } });
    if (!commande) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }

    const utilisateur = await this.authService.syncUser(tokenUser);
    const isAdmin = tokenUser.roles.includes('admin');
    const isAssignedLivreur = commande.livreurId === utilisateur.idUtilisateur;

    if (!isAdmin && !isAssignedLivreur) {
      throw new ForbiddenException("Vous n'êtes pas assigné à cette commande");
    }

    const updated = await this.prisma.commande.update({
      where: { idCommande: id },
      data: {
        etat: dto.etat,
        historique: { create: { etat: dto.etat } },
      },
      include: ORDER_INCLUDE,
    });

    this.trackingGateway.notifyOrderUpdate(commande.utilisateurId, updated);

    // Email au client : requête séparée pour l'adresse mail, volontairement
    // exclue de ORDER_INCLUDE.utilisateur (qui est aussi renvoyé au client lui-même).
    // On ne bloque pas la réponse si l'envoi échoue (SMTP down, etc.).
    this.prisma.utilisateur
      .findUnique({ where: { idUtilisateur: commande.utilisateurId }, select: { email: true } })
      .then((client) => {
        if (client?.email) {
          return this.emailService.sendOrderStatusUpdate(client.email, id, dto.etat);
        }
      })
      .catch(() => {});

    return updated;
  }

  private async getOwnedCommande(id: number, tokenUser: AuthenticatedUser) {
    const utilisateur = await this.authService.syncUser(tokenUser);
    const commande = await this.prisma.commande.findUnique({
      where: { idCommande: id },
      include: { produits: true, paiement: true },
    });

    if (!commande) {
      throw new NotFoundException(`Commande ${id} introuvable`);
    }
    if (commande.utilisateurId !== utilisateur.idUtilisateur) {
      throw new ForbiddenException('Cette commande ne vous appartient pas');
    }

    return commande;
  }

  private assertModifiable(commande: {
    etat: EtatCommande;
    paiement: { methodePaiement: MethodePaiement; statut: StatutPaiement } | null;
  }) {
    const isEnLigne = commande.paiement?.methodePaiement === MethodePaiement.EN_LIGNE;

    if (isEnLigne) {
      if (commande.paiement?.statut !== StatutPaiement.PENDING) {
        throw new BadRequestException(
          'Le paiement a déjà été traité, la commande ne peut plus être modifiée',
        );
      }
    } else if (commande.etat !== EtatCommande.EN_ATTENTE) {
      throw new BadRequestException(
        'La commande a déjà été expédiée, elle ne peut plus être modifiée',
      );
    }
  }
}
