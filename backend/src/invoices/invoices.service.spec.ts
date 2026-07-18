import { EventEmitter } from 'events';
import { InvoicesService } from './invoices.service';

// Simule un PDFKit.PDFDocument juste assez pour renderPdfToBuffer : émet un
// chunk puis 'end' dès qu'on l'appelle, sans dépendre du vrai rendu PDFKit
// (lent et hors-sujet pour un test unitaire de logique métier).
class FakeDoc extends EventEmitter {
  end() {
    this.emit('data', Buffer.from('pdf-bytes'));
    this.emit('end');
  }
}

describe('InvoicesService', () => {
  function makeService() {
    const prisma: any = {
      facture: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(3),
        create: jest.fn().mockImplementation(({ data }) => ({
          idFacture: 1,
          dateEmission: new Date(),
          ...data,
        })),
      },
      commande: { findUnique: jest.fn() },
    };
    prisma.$transaction = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));

    const authService = { syncUser: jest.fn() };
    const emailService = { sendInvoiceEmail: jest.fn().mockResolvedValue(undefined) };
    const service = new InvoicesService(prisma as any, authService as any, emailService as any);

    return { service, prisma, authService, emailService };
  }

  describe('generateForCommande', () => {
    it('ne recrée pas de facture si une existe déjà pour la commande (idempotence)', async () => {
      const { service, prisma } = makeService();
      prisma.facture.findUnique.mockResolvedValue({ idFacture: 5, commandeId: 10 });

      const result = await service.generateForCommande(10);

      expect(result).toEqual({ idFacture: 5, commandeId: 10 });
      expect(prisma.commande.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("renvoie null si la commande n'existe pas", async () => {
      const { service, prisma } = makeService();
      prisma.facture.findUnique.mockResolvedValue(null);
      prisma.commande.findUnique.mockResolvedValue(null);

      const result = await service.generateForCommande(10);

      expect(result).toBeNull();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('crée une facture avec un numéro bien formé et le bon montant', async () => {
      const { service, prisma } = makeService();
      prisma.facture.findUnique.mockResolvedValue(null);
      prisma.commande.findUnique.mockResolvedValue({ idCommande: 10, montantTotal: 150.5 });
      prisma.facture.count.mockResolvedValue(3);

      await service.generateForCommande(10);

      const year = new Date().getFullYear();
      expect(prisma.facture.create).toHaveBeenCalledWith({
        data: {
          commandeId: 10,
          numeroFacture: `FAC-${year}-000004`,
          montant: 150.5,
        },
      });
    });
  });

  describe('sendInvoiceByEmail', () => {
    it("ne fait rien si la commande n'a pas de facture", async () => {
      const { service, prisma, emailService } = makeService();
      prisma.commande.findUnique.mockResolvedValue({ facture: null });

      await service.sendInvoiceByEmail(10);

      expect(emailService.sendInvoiceEmail).not.toHaveBeenCalled();
    });

    it('génère le PDF et envoie la facture au bon destinataire', async () => {
      const { service, prisma, emailService } = makeService();
      prisma.commande.findUnique.mockResolvedValue({
        facture: { numeroFacture: 'FAC-2026-000001' },
        utilisateur: { email: 'client@test.com' },
        produits: [],
      });
      jest.spyOn(service, 'buildPdf').mockReturnValue(new FakeDoc() as never);

      await service.sendInvoiceByEmail(10);

      expect(emailService.sendInvoiceEmail).toHaveBeenCalledWith(
        'client@test.com',
        'FAC-2026-000001',
        Buffer.from('pdf-bytes'),
      );
    });

    // Contrat explicitement voulu (voir commentaire dans invoices.service.ts) :
    // un échec d'envoi d'email ne doit jamais remonter comme une erreur de
    // paiement/confirmation côté appelant (PaymentsService).
    it("ne relance pas l'erreur si l'envoi de l'email échoue", async () => {
      const { service, prisma, emailService } = makeService();
      prisma.commande.findUnique.mockResolvedValue({
        facture: { numeroFacture: 'FAC-2026-000001' },
        utilisateur: { email: 'client@test.com' },
        produits: [],
      });
      jest.spyOn(service, 'buildPdf').mockReturnValue(new FakeDoc() as never);
      emailService.sendInvoiceEmail.mockRejectedValue(new Error('SMTP down'));

      await expect(service.sendInvoiceByEmail(10)).resolves.toBeUndefined();
    });
  });
});
