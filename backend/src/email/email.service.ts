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

    await this.transporter.sendMail({ from: this.from, to, subject, text, attachments });
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
