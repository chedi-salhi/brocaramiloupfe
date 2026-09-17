import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { montantEnLettres } from './montant-en-lettres';

// Taux de TVA standard tunisien, uniforme pour tous les produits — il n'y a
// pas (encore) de champ de taux par produit, donc pas de ligne de taxe par
// palier dans le bloc Base/Taux/Taxe, une seule ligne suffit.
const TVA_RATE = 19;
// Droit de timbre fiscal, montant fixe appliqué aux factures commerciales en
// Tunisie (indépendant du montant de la facture).
const TIMBRE_FISCAL = 1;

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
    produits: {
      quantite: number;
      prixUnitaire: unknown;
      produit: { idProduit: number; nom: string; unite: string };
    }[];
    facture: { numeroFacture: string; dateEmission: Date; montant: unknown } | null;
  }) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const PAGE_LEFT = 40;
    const PAGE_RIGHT = 555;
    const PAGE_BOTTOM = 780;

    const numero = commande.facture?.numeroFacture ?? '';
    const date = commande.facture?.dateEmission?.toLocaleDateString('fr-FR') ?? '';

    // --- En-tête : nom de la société à gauche, référence facture à droite.
    // Volontairement minimal (pas de matricule fiscal / RIB / logo) — c'est
    // la partie laissée à l'administration de la société à compléter.
    doc.fontSize(18).font('Helvetica-Bold').text('Brocaramilou', PAGE_LEFT, 40);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666')
      .text('Vente en gros et au détail — Tunisie', PAGE_LEFT, 62);
    doc.fillColor('#000');

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('FACTURE', PAGE_LEFT, 40, { width: PAGE_RIGHT - PAGE_LEFT, align: 'right' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`N° ${numero}`, PAGE_LEFT, 64, { width: PAGE_RIGHT - PAGE_LEFT, align: 'right' })
      .text(`Date : ${date}`, PAGE_LEFT, 78, { width: PAGE_RIGHT - PAGE_LEFT, align: 'right' })
      .text(`Commande : #${commande.idCommande}`, PAGE_LEFT, 92, {
        width: PAGE_RIGHT - PAGE_LEFT,
        align: 'right',
      });

    doc.moveTo(PAGE_LEFT, 112).lineTo(PAGE_RIGHT, 112).strokeColor('#ccc').stroke();
    doc.strokeColor('#000');

    doc.fontSize(9).font('Helvetica-Bold').text('Client', PAGE_LEFT, 120);
    doc
      .font('Helvetica')
      .text(`${commande.utilisateur.prenom ?? ''} ${commande.utilisateur.nom}`.trim(), PAGE_LEFT, 132)
      .text(commande.utilisateur.email, PAGE_LEFT, 145)
      .text(commande.adresseLivraison ?? '', PAGE_LEFT, 158, { width: PAGE_RIGHT - PAGE_LEFT });

    // --- Tableau produits ---
    const columns = [
      { label: 'Code', x: 40, width: 45, align: 'left' as const },
      { label: 'Désignation', x: 85, width: 155, align: 'left' as const },
      { label: 'Qté', x: 240, width: 30, align: 'right' as const },
      { label: 'UN', x: 270, width: 30, align: 'center' as const },
      { label: 'P.U.H.T', x: 300, width: 55, align: 'right' as const },
      { label: 'TVA %', x: 355, width: 35, align: 'right' as const },
      { label: 'P.U.TTC', x: 390, width: 55, align: 'right' as const },
      { label: 'Rem%', x: 445, width: 35, align: 'right' as const },
      { label: 'Net H.T.', x: 480, width: 75, align: 'right' as const },
    ];

    const drawTableHeader = (yPos: number): number => {
      doc.rect(PAGE_LEFT, yPos, PAGE_RIGHT - PAGE_LEFT, 20).fillAndStroke('#f3f3f3', '#999');
      doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');
      for (const col of columns) {
        doc.text(col.label, col.x + 3, yPos + 6, { width: col.width - 6, align: col.align });
      }
      doc.font('Helvetica');
      return yPos + 20;
    };

    let y = drawTableHeader(190);
    let totalHTBrut = 0;

    for (const item of commande.produits) {
      if (y > PAGE_BOTTOM - 40) {
        doc.addPage();
        y = drawTableHeader(40);
      }

      const puTTC = Number(String(item.prixUnitaire));
      const puHT = puTTC / (1 + TVA_RATE / 100);
      const netHT = puHT * item.quantite;
      totalHTBrut += netHT;

      doc.rect(PAGE_LEFT, y, PAGE_RIGHT - PAGE_LEFT, 18).strokeColor('#ddd').stroke();
      doc.strokeColor('#000');
      doc.fillColor('#000').fontSize(8).font('Helvetica');
      const cellY = y + 5;
      doc.text(String(item.produit.idProduit), columns[0].x + 3, cellY, { width: columns[0].width - 6 });
      doc.text(item.produit.nom, columns[1].x + 3, cellY, { width: columns[1].width - 6 });
      doc.text(String(item.quantite), columns[2].x + 3, cellY, {
        width: columns[2].width - 6,
        align: 'right',
      });
      doc.text(item.produit.unite, columns[3].x + 3, cellY, { width: columns[3].width - 6, align: 'center' });
      doc.text(puHT.toFixed(3), columns[4].x + 3, cellY, { width: columns[4].width - 6, align: 'right' });
      doc.text(TVA_RATE.toFixed(2), columns[5].x + 3, cellY, { width: columns[5].width - 6, align: 'right' });
      doc.text(puTTC.toFixed(3), columns[6].x + 3, cellY, { width: columns[6].width - 6, align: 'right' });
      doc.text('0.00', columns[7].x + 3, cellY, { width: columns[7].width - 6, align: 'right' });
      doc.text(netHT.toFixed(3), columns[8].x + 3, cellY, { width: columns[8].width - 6, align: 'right' });

      y += 18;
    }

    y += 15;
    if (y > PAGE_BOTTOM - 160) {
      doc.addPage();
      y = 40;
    }

    const totalTVA = totalHTBrut * (TVA_RATE / 100);
    const netAPayer = totalHTBrut + totalTVA + TIMBRE_FISCAL;

    // --- Bloc Base/Taux/Taxe (bas gauche) : une seule ligne, taux unique. ---
    const taxBoxY = y;
    doc.rect(PAGE_LEFT, taxBoxY, 220, 52).strokeColor('#999').stroke();
    doc.strokeColor('#000');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Base', PAGE_LEFT + 5, taxBoxY + 6, { width: 65 });
    doc.text('Taux', PAGE_LEFT + 75, taxBoxY + 6, { width: 65 });
    doc.text('Taxe', PAGE_LEFT + 145, taxBoxY + 6, { width: 65 });
    doc.font('Helvetica');
    doc.text(totalHTBrut.toFixed(2), PAGE_LEFT + 5, taxBoxY + 18, { width: 65 });
    doc.text(`${TVA_RATE.toFixed(3)}`, PAGE_LEFT + 75, taxBoxY + 18, { width: 65 });
    doc.text(totalTVA.toFixed(3), PAGE_LEFT + 145, taxBoxY + 18, { width: 65 });
    doc.font('Helvetica-Bold').text('Total Taxe', PAGE_LEFT + 5, taxBoxY + 36);
    doc.font('Helvetica').text(totalTVA.toFixed(3), PAGE_LEFT + 75, taxBoxY + 36);

    // --- Bloc totaux (bas droite) ---
    const totalsX = 310;
    const totalsWidth = PAGE_RIGHT - totalsX;
    const totalsRows: [string, string][] = [
      ['Total H.T Brut :', totalHTBrut.toFixed(3)],
      ['Remise Articles :', '0.000'],
      ['Total H.T Net :', totalHTBrut.toFixed(3)],
      ['Total TVA :', totalTVA.toFixed(3)],
      ['Timbre Fiscal :', TIMBRE_FISCAL.toFixed(3)],
      ['Net A Payer :', netAPayer.toFixed(3)],
    ];
    let ty = taxBoxY;
    doc.fontSize(9);
    for (const [label, value] of totalsRows) {
      const isNet = label === 'Net A Payer :';
      doc.font(isNet ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(label, totalsX, ty, { width: 120 });
      doc.text(`${value} DT`, totalsX + 120, ty, { width: totalsWidth - 120, align: 'right' });
      ty += 15;
    }

    // --- Montant en lettres ---
    y = Math.max(taxBoxY + 62, ty + 10);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Arrêtée la présente facture à la somme de :', PAGE_LEFT, y);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text(montantEnLettres(netAPayer), PAGE_LEFT, y + 14, { width: PAGE_RIGHT - PAGE_LEFT });

    // --- Notes / Signatures ---
    y += 50;
    if (y > PAGE_BOTTOM - 90) {
      doc.addPage();
      y = 40;
    }
    const boxWidth = (PAGE_RIGHT - PAGE_LEFT - 20) / 3;
    const boxLabels = ['Notes', 'Signature Client', 'Signature & Cachet'];
    boxLabels.forEach((label, i) => {
      const bx = PAGE_LEFT + i * (boxWidth + 10);
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#555').text(label, bx + 6, y);
      doc.fillColor('#000');
      doc
        .roundedRect(bx, y + 12, boxWidth, 70, 4)
        .strokeColor('#999')
        .stroke();
      doc.strokeColor('#000');
    });

    return doc;
  }
}
