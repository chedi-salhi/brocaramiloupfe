import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MethodePaiement, StatutPaiement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PaypalClientService } from './paypal-client.service';
import { OrdersService } from '../orders/orders.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

// PayPal ne supporte pas le Dinar tunisien (TND) — conversion approximative
// uniquement pour permettre un vrai checkout PayPal sandbox en démo. Le
// montant facturé/affiché au client reste toujours en TND
// (Commande.montantTotal, Paiement.montant) ; seul l'appel à PayPal utilise
// ce taux fixe. Pas d'appel à une API de change en temps réel : suffisant
// pour une démonstration, à revoir avant tout encaissement réel.
const TND_TO_USD_RATE = Number(process.env.PAYPAL_TND_TO_USD_RATE ?? '0.32');
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY ?? 'USD';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly invoicesService: InvoicesService,
    private readonly paypalClient: PaypalClientService,
    private readonly ordersService: OrdersService,
  ) {}

  // Crée la commande PayPal (sandbox) et renvoie le lien d'approbation vers
  // lequel le frontend redirige le navigateur juste après la création de la
  // commande app (voir CheckoutForm). Rien n'est confirmé/facturé à cette
  // étape — seulement après capture (voir captureOnlinePayment).
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
    if (paiement.statut === StatutPaiement.SUCCESS) {
      throw new BadRequestException('Ce paiement a déjà été traité');
    }

    const montantTnd = Number(paiement.montant.toString());
    const montantConverti = (montantTnd * TND_TO_USD_RATE).toFixed(2);

    const order = await this.paypalClient.createOrder({
      amount: montantConverti,
      currency: PAYPAL_CURRENCY,
      customId: String(commandeId),
      returnUrl: `${FRONTEND_URL}/paiement/retour?commandeId=${commandeId}`,
      cancelUrl: `${FRONTEND_URL}/paiement/annule?commandeId=${commandeId}`,
    });

    const approvalUrl = order.links.find((link) => link.rel === 'approve')?.href;
    if (!approvalUrl) {
      throw new BadRequestException("PayPal n'a renvoyé aucun lien d'approbation");
    }

    // Réutilise transactionId (déjà prévu pour ça dans le schéma) pour
    // stocker l'id de commande PayPal — nécessaire pour la capture ensuite.
    await this.prisma.paiement.update({
      where: { idPaiement: paiement.idPaiement },
      data: { transactionId: order.id, provider: 'paypal' },
    });

    return { approvalUrl };
  }

  // Appelé quand le client revient sur l'app depuis PayPal (return_url,
  // page /paiement/retour côté frontend) : capture réellement les fonds —
  // c'est cet appel, pas l'approbation côté PayPal, qui déclenche facture +
  // email, exactement comme confirmCashPayment côté cash.
  async captureOnlinePayment(commandeId: number, tokenUser: AuthenticatedUser) {
    const utilisateur = await this.authService.syncUser(tokenUser);

    const paiement = await this.prisma.paiement.findUnique({
      where: { commandeId },
      include: { commande: { include: { utilisateur: true } } },
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

    // Idempotence : la page /paiement/retour peut être rechargée (retour
    // arrière navigateur, double appel React en dev...) sans capturer deux
    // fois ni renvoyer deux fois la facture.
    if (paiement.statut === StatutPaiement.SUCCESS) {
      return paiement;
    }
    if (!paiement.transactionId) {
      throw new BadRequestException('Aucun paiement PayPal en cours pour cette commande');
    }

    const capture = await this.paypalClient.captureOrder(paiement.transactionId);
    const success = capture.status === 'COMPLETED';

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
      // C'est SEULEMENT maintenant, paiement PayPal réellement confirmé,
      // que le stock est décrémenté et le panier consommé (voir
      // OrdersService.create/confirmOnlinePaymentSuccess) — avant ce point,
      // ni l'un ni l'autre n'avait bougé.
      await this.ordersService.confirmOnlinePaymentSuccess(commandeId);
      await this.invoicesService.generateForCommande(commandeId);
      await this.invoicesService.sendInvoiceByEmail(commandeId);
    } else {
      // Paiement refusé par PayPal : la commande ne doit surtout pas rester
      // "En attente" comme une commande normale. Comme le stock/panier
      // n'ont jamais été touchés pour une commande EN_LIGNE non payée (voir
      // create()), ordersService.cancel() se contente ici de marquer la
      // commande Annulée, sans rien restaurer. Sans ça, l'admin verrait une
      // commande jamais payée exactement comme une commande confirmée.
      await this.ordersService.cancel(commandeId, tokenUser);
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
