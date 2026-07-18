import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  // Appelé automatiquement par PaymentsService quand un paiement passe à SUCCESS.
  // Idempotent : si la facture existe déjà pour cette commande, on ne la recrée pas.
  async generateForCommande(commandeId: number) {
    const existing = await this.prisma.facture.findUnique({ where: { commandeId } });
    if (existing) return existing;

    const commande = await this.prisma.commande.findUnique({ where: { idCommande: commandeId } });
    if (!commande) return null;

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.facture.count();
      const numeroFacture = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

      return tx.facture.create({
        data: {
          commandeId,
          numeroFacture,
          montant: commande.montantTotal,
        },
      });
    });
  }

  async getFactureData(commandeId: number, tokenUser: AuthenticatedUser) {
    const commande = await this.prisma.commande.findUnique({
      where: { idCommande: commandeId },
      include: {
        produits: { include: { produit: true } },
        facture: true,
        utilisateur: true,
      },
    });

    if (!commande || !commande.facture) {
      throw new NotFoundException(
        "Facture introuvable — le paiement n'a peut-être pas encore été confirmé",
      );
    }

    const utilisateur = await this.authService.syncUser(tokenUser);
    const isAdmin = tokenUser.roles.includes('admin');
    if (commande.utilisateurId !== utilisateur.idUtilisateur && !isAdmin) {
      throw new ForbiddenException('Cette facture ne vous appartient pas');
    }

    return commande;
  }

  // Déclenché par PaymentsService juste après generateForCommande, aussi bien
  // pour le paiement en ligne (webhook) que pour le cash confirmé par le
  // livreur/admin — même circuit dans les deux cas, rien à distinguer ici.
  // N'échoue jamais bruyamment : un email en échec ne doit pas remonter comme
  // une erreur de paiement/confirmation côté appelant.
  async sendInvoiceByEmail(commandeId: number) {
    try {
      const commande = await this.prisma.commande.findUnique({
        where: { idCommande: commandeId },
        include: {
          produits: { include: { produit: true } },
          facture: true,
          utilisateur: true,
        },
      });

      if (!commande?.facture) return;

      const pdf = await this.renderPdfToBuffer(this.buildPdf(commande));
      await this.emailService.sendInvoiceEmail(
        commande.utilisateur.email,
        commande.facture.numeroFacture,
        pdf,
      );
    } catch (err) {
      this.logger.error(`Échec de l'envoi de la facture par email (commande ${commandeId})`, err as Error);
    }
  }

  private renderPdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  markPrinted(factureId: number) {
    return this.prisma.facture.update({
      where: { idFacture: factureId },
      data: { isPrinted: true },
    });
  }

  buildPdf(commande: {
    idCommande: number;
    adresseLivraison: string | null;
    utilisateur: { nom: string; prenom: string | null; email: string };
    produits: { quantite: number; prixUnitaire: unknown; produit: { nom: string } }[];
    facture: { numeroFacture: string; dateEmission: Date; montant: unknown } | null;
  }) {
    const doc = new PDFDocument({ margin: 50 });

    doc.fontSize(18).text('Facture', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`N° facture : ${commande.facture?.numeroFacture ?? ''}`);
    doc.text(`Date : ${commande.facture?.dateEmission.toLocaleDateString('fr-FR') ?? ''}`);
    doc.text(`Commande : #${commande.idCommande}`);
    doc.moveDown();
    doc.text(`Client : ${commande.utilisateur.prenom ?? ''} ${commande.utilisateur.nom}`);
    doc.text(`Email : ${commande.utilisateur.email}`);
    doc.text(`Adresse de livraison : ${commande.adresseLivraison ?? ''}`);
    doc.moveDown();

    let y = doc.y;
    doc.text('Produit', 50, y);
    doc.text('Qté', 300, y);
    doc.text('Prix unitaire', 350, y);
    doc.text('Total', 470, y);
    y += 20;

    for (const item of commande.produits) {
      const prixUnitaire = Number(String(item.prixUnitaire));
      const total = prixUnitaire * item.quantite;
      doc.text(item.produit.nom, 50, y);
      doc.text(String(item.quantite), 300, y);
      doc.text(`${prixUnitaire.toFixed(2)} DT`, 350, y);
      doc.text(`${total.toFixed(2)} DT`, 470, y);
      y += 20;
    }

    y += 10;
    doc
      .fontSize(12)
      .text(`Montant total : ${Number(String(commande.facture?.montant ?? '0')).toFixed(2)} DT`, 50, y, {
        align: 'right',
      });

    return doc;
  }
}
