import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<string>('EMAIL_PORT');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');
    this.from = this.configService.get<string>('EMAIL_FROM') ?? 'no-reply@brocaramilou.com';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    } else {
      // Pas de SMTP configuré en dev : on log au lieu d'échouer, pour ne pas bloquer
      // le reste du flux (paiement, commande...) tant que Mailtrap/SMTP n'est pas branché.
      this.transporter = null;
      this.logger.warn(
        'EMAIL_HOST/EMAIL_USER/EMAIL_PASS non configurés — les emails seront seulement loggés',
      );
    }
  }

  async send(
    to: string,
    subject: string,
    text: string,
    attachments?: { filename: string; content: Buffer }[],
  ) {
    if (!this.transporter) {
      this.logger.log(
        `[email simulé] à ${to} — ${subject} : ${text}${attachments ? ` (+${attachments.length} pièce(s) jointe(s))` : ''}`,
      );
      return;
    }

    // L'envoi d'email est un effet de bord "best effort" : plusieurs
    // appelants (confirmCashPayment, captureOnlinePayment...) écrivent déjà
    // en base AVANT d'envoyer l'email de notification — si sendMail() rejette
    // (SMTP injoignable/mal configuré) sans être rattrapé ici, l'exception
    // remonte jusqu'au controller et fait échouer toute la requête avec un
    // 500, alors que l'action métier (paiement confirmé, stock décrémenté...)
    // a déjà réussi. Reproduit en CI (22/09/2026) : EMAIL_HOST/USER/PASS sont
    // tous renseignés dans docker-compose.ci.yml (valeurs bidon), donc un
    // vrai transporteur nodemailer est créé (voir constructeur ci-dessus) et
    // sendMail() échoue pour de vrai contre smtp.example.invalid — ce qui
    // annulait la confirmation cash/carte vue côté utilisateur alors que le
    // paiement était bel et bien enregistré. Même logique déjà appliquée par
    // AuthService.sendVerificationEmail à son propre appel ; centralisée ici
    // pour couvrir tous les appelants (paiement, facture, statut commande,
    // annonces) sans dépendre de chaque site d'appel pour s'en souvenir.
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, attachments });
    } catch (err) {
      this.logger.error(`Échec de l'envoi d'email à ${to} (${subject})`, err as Error);
    }
  }

  sendPaymentConfirmation(to: string, success: boolean, montant: number) {
    const subject = success ? 'Paiement confirmé' : 'Échec du paiement';
    const text = success
      ? `Votre paiement de ${montant} DT a été confirmé avec succès.`
      : `Votre paiement de ${montant} DT a échoué. Merci de réessayer.`;
    return this.send(to, subject, text);
  }

  private static readonly ETAT_LABELS: Record<string, string> = {
    EN_ATTENTE: 'en attente',
    EN_LIVRAISON: 'en cours de livraison',
    LIVREE: 'livrée',
    ANNULEE: 'annulée',
  };

  sendOrderStatusUpdate(to: string, commandeId: number, etat: string) {
    const label = EmailService.ETAT_LABELS[etat] ?? etat;
    const subject = `Commande #${commandeId} — ${label}`;
    const text = `Bonjour,\n\nLe statut de votre commande #${commandeId} est maintenant : ${label}.\n\n— Brocaramilou`;
    return this.send(to, subject, text);
  }

  sendAnnouncementNotification(to: string, titre: string, description: string) {
    const subject = `Nouvelle annonce : ${titre}`;
    const text = `${titre}\n\n${description}\n\n— Brocaramilou`;
    return this.send(to, subject, text);
  }

  sendVerificationEmail(to: string, verifyUrl: string) {
    const subject = 'Confirme ton adresse email';
    const text = `Bonjour,\n\nMerci de confirmer ton adresse email en cliquant sur ce lien :\n${verifyUrl}\n\nCe lien expire dans 24h.\n\n— Brocaramilou`;
    return this.send(to, subject, text);
  }

  sendInvoiceEmail(to: string, numeroFacture: string, pdf: Buffer) {
    const subject = `Facture ${numeroFacture}`;
    const text = `Bonjour,\n\nVoici la facture ${numeroFacture} de ta commande, en pièce jointe.\n\nMerci pour ta confiance !\n\n— Brocaramilou`;
    return this.send(to, subject, text, [{ filename: `${numeroFacture}.pdf`, content: pdf }]);
  }
}
