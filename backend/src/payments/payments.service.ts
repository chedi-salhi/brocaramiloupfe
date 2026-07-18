import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MethodePaiement, StatutPaiement } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly invoicesService: InvoicesService,
  ) {}

  // Simule l'appel à Flouci (ou tout autre prestataire) : génère une référence de
  // transaction et un lien de paiement fictif. À remplacer par l'appel réel une fois
  // le compte développeur Flouci disponible — même signature de méthode pour le reste
  // du code (orders, controller) qui n'aura rien à changer.
  async initiateOnlinePayment(commandeId: number, tokenUser: AuthenticatedUser) {
    const utilisateur = await this.authService.syncUser(tokenUser);

    const paiement = await this.prisma.paiement.findUnique({
      where: { commandeId },
      include: { commande: true },
    });

    if (!paiement) {
      throw new NotFoundException(`Paiement introuvable pour la commande ${commandeId}`);
    }
    if (paiement.commande.utilisateurId !== utilisateur.idUtilisateur) {
      throw new ForbiddenException('Cette commande ne vous appartient pas');
    }
    if (paiement.methodePaiement !== MethodePaiement.EN_LIGNE) {
      throw new BadRequestException('Cette commande est en paiement à la livraison');
    }
    if (paiement.statut !== StatutPaiement.PENDING) {
      throw new BadRequestException('Ce paiement a déjà été traité');
    }

    const transactionId = randomUUID();

    await this.prisma.paiement.update({
      where: { idPaiement: paiement.idPaiement },
      data: { transactionId, provider: 'mock' },
    });

    // Dans une vraie intégration Flouci, ceci serait l'URL de paiement hébergée
    // renvoyée par leur API ; le frontend y redirigerait le client.
    return {
      paymentUrl: `https://mock-payment.local/pay/${transactionId}`,
      transactionId,
    };
  }

  // Simule le webhook que le prestataire appellerait après le paiement. À remplacer
  // par la vérification de signature réelle au moment de l'intégration Flouci.
  async handleCallback(transactionId: string, success: boolean) {
    const paiement = await this.prisma.paiement.findFirst({
      where: { transactionId },
      include: { commande: { include: { utilisateur: true } } },
    });

    if (!paiement) {
      throw new NotFoundException('Transaction introuvable');
    }
    if (paiement.statut !== StatutPaiement.PENDING) {
      return paiement;
    }

    const updated = await this.prisma.paiement.update({
      where: { idPaiement: paiement.idPaiement },
      data: {
        statut: success ? StatutPaiement.SUCCESS : StatutPaiement.FAILED,
        notificationSent: true,
      },
    });

    await this.emailService.sendPaymentConfirmation(
      paiement.commande.utilisateur.email,
      success,
      Number(paiement.montant.toString()),
    );

    if (success) {
      await this.invoicesService.generateForCommande(paiement.commandeId);
      await this.invoicesService.sendInvoiceByEmail(paiement.commandeId);
    }

    return updated;
  }

  // Paiement à la livraison : le livreur (ou l'admin) confirme la réception du cash
  // au moment de la livraison.
  async confirmCashPayment(commandeId: number, tokenUser: AuthenticatedUser) {
    const paiement = await this.prisma.paiement.findUnique({
      where: { commandeId },
      include: { commande: { include: { utilisateur: true } } },
    });

    if (!paiement) {
      throw new NotFoundException(`Paiement introuvable pour la commande ${commandeId}`);
    }
    if (paiement.methodePaiement !== MethodePaiement.A_LA_LIVRAISON) {
      throw new BadRequestException('Cette commande est en paiement en ligne');
    }

    const utilisateur = await this.authService.syncUser(tokenUser);
    const isAdmin = tokenUser.roles.includes('admin');
    const isAssignedLivreur = paiement.commande.livreurId === utilisateur.idUtilisateur;
    if (!isAdmin && !isAssignedLivreur) {
      throw new ForbiddenException("Vous n'êtes pas assigné à cette commande");
    }

    // Idempotence : sans ce garde-fou, un double clic front ou deux appels
    // concurrents (admin + livreur) renvoyaient un deuxième email de
    // confirmation et un deuxième email de facture pour la même commande.
    if (paiement.statut === StatutPaiement.SUCCESS) {
      return paiement;
    }

    const updated = await this.prisma.paiement.update({
      where: { idPaiement: paiement.idPaiement },
      data: {
        statut: StatutPaiement.SUCCESS,
        confirmedById: utilisateur.idUtilisateur,
        notificationSent: true,
      },
    });

    await this.emailService.sendPaymentConfirmation(
      paiement.commande.utilisateur.email,
      true,
      Number(paiement.montant.toString()),
    );

    await this.invoicesService.generateForCommande(commandeId);
    await this.invoicesService.sendInvoiceByEmail(commandeId);

    return updated;
  }
}
