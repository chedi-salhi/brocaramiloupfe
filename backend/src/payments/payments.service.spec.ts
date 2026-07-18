import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MethodePaiement, StatutPaiement } from '@prisma/client';
import { PaymentsService } from './payments.service';

// Tests unitaires purs : les dépendances (Prisma, Auth, Email, Invoices) sont
// mockées à la main plutôt que via un TestingModule Nest — on teste la logique
// métier de PaymentsService, pas le câblage DI.
describe('PaymentsService', () => {
  // Utilisateur renvoyé par authService.syncUser pour TOUT token dans ces
  // tests. Le livreur "assigné" par défaut a donc idUtilisateur=5 : les
  // fixtures de commande doivent utiliser livreurId:5 pour représenter un
  // livreur correctement assigné, et un autre id pour représenter le cas
  // "non assigné".
  const utilisateur = { idUtilisateur: 5, email: 'client@test.com' };

  function makePaiement(overrides: Record<string, unknown> = {}) {
    return {
      idPaiement: 1,
      commandeId: 10,
      transactionId: 'tx-1',
      montant: { toString: () => '99.90' },
      methodePaiement: MethodePaiement.A_LA_LIVRAISON,
      statut: StatutPaiement.PENDING,
      commande: { livreurId: 5, utilisateur: { email: 'client@test.com' } },
      ...overrides,
    };
  }

  function makeService(paiement: ReturnType<typeof makePaiement> | null) {
    const prisma = {
      paiement: {
        findUnique: jest.fn().mockResolvedValue(paiement),
        findFirst: jest.fn().mockResolvedValue(paiement),
        update: jest.fn().mockImplementation(({ data }) => ({ ...paiement, ...data })),
      },
    };
    const authService = { syncUser: jest.fn().mockResolvedValue(utilisateur) };
    const emailService = { sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined) };
    const invoicesService = {
      generateForCommande: jest.fn().mockResolvedValue({ idFacture: 1 }),
      sendInvoiceByEmail: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PaymentsService(
      prisma as any,
      authService as any,
      emailService as any,
      invoicesService as any,
    );

    return { service, prisma, authService, emailService, invoicesService };
  }

  const tokenLivreur = { keycloakId: 'kc-2', email: 'l@test.com', roles: ['livreur'] };
  const tokenAdmin = { keycloakId: 'kc-9', email: 'a@test.com', roles: ['admin'] };
  const tokenAutreLivreur = { keycloakId: 'kc-3', email: 'x@test.com', roles: ['livreur'] };

  describe('confirmCashPayment', () => {
    it('confirme le paiement, envoie la confirmation et génère la facture (livreur assigné)', async () => {
      const { service, prisma, emailService, invoicesService } = makeService(makePaiement());

      const result = await service.confirmCashPayment(10, tokenLivreur);

      expect(prisma.paiement.update).toHaveBeenCalledWith({
        where: { idPaiement: 1 },
        data: {
          statut: StatutPaiement.SUCCESS,
          confirmedById: 5,
          notificationSent: true,
        },
      });
      expect(emailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        'client@test.com',
        true,
        99.9,
      );
      expect(invoicesService.generateForCommande).toHaveBeenCalledWith(10);
      expect(invoicesService.sendInvoiceByEmail).toHaveBeenCalledWith(10);
      expect(result.statut).toBe(StatutPaiement.SUCCESS);
    });

    it('lève NotFoundException si aucun paiement ne correspond à la commande', async () => {
      const { service } = makeService(null);
      await expect(service.confirmCashPayment(10, tokenLivreur)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève BadRequestException si la commande est en paiement en ligne', async () => {
      const { service } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.EN_LIGNE }),
      );
      await expect(service.confirmCashPayment(10, tokenLivreur)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lève ForbiddenException si l'appelant n'est ni admin ni le livreur assigné", async () => {
      const { service } = makeService(
        makePaiement({ commande: { livreurId: 999, utilisateur: { email: 'client@test.com' } } }),
      );
      await expect(service.confirmCashPayment(10, tokenAutreLivreur)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("un admin peut confirmer même sans être le livreur assigné", async () => {
      const { service, prisma } = makeService(
        makePaiement({ commande: { livreurId: 999, utilisateur: { email: 'client@test.com' } } }),
      );
      await expect(service.confirmCashPayment(10, tokenAdmin)).resolves.toBeDefined();
      expect(prisma.paiement.update).toHaveBeenCalled();
    });

    // Régression : jusqu'ici confirmCashPayment ne vérifiait pas le statut avant
    // d'agir, contrairement à handleCallback (paiement en ligne) qui a bien ce
    // garde-fou. Un double clic front, une requête rejouée, ou deux appels
    // concurrents (admin + livreur) renvoyaient deux fois l'email de facture au
    // client. Ce test verrouille le comportement idempotent attendu — il
    // échouait avant le correctif ajouté dans payments.service.ts.
    it('ne refait rien si le paiement est déjà confirmé (idempotence)', async () => {
      const { service, prisma, emailService, invoicesService } = makeService(
        makePaiement({ statut: StatutPaiement.SUCCESS, confirmedById: 5 }),
      );

      await service.confirmCashPayment(10, tokenLivreur);

      expect(prisma.paiement.update).not.toHaveBeenCalled();
      expect(emailService.sendPaymentConfirmation).not.toHaveBeenCalled();
      expect(invoicesService.generateForCommande).not.toHaveBeenCalled();
      expect(invoicesService.sendInvoiceByEmail).not.toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    it('marque le paiement SUCCESS et génère la facture quand success=true', async () => {
      const { service, invoicesService } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.EN_LIGNE }),
      );
      await service.handleCallback('tx-1', true);
      expect(invoicesService.generateForCommande).toHaveBeenCalledWith(10);
      expect(invoicesService.sendInvoiceByEmail).toHaveBeenCalledWith(10);
    });

    it('ne génère pas de facture quand success=false', async () => {
      const { service, invoicesService } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.EN_LIGNE }),
      );
      await service.handleCallback('tx-1', false);
      expect(invoicesService.generateForCommande).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si la transaction est inconnue', async () => {
      const { service } = makeService(null);
      await expect(service.handleCallback('tx-inconnue', true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('est déjà idempotent : un second callback sur un paiement déjà traité ne fait rien', async () => {
      const { service, prisma, invoicesService } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.SUCCESS }),
      );
      await service.handleCallback('tx-1', true);
      expect(prisma.paiement.update).not.toHaveBeenCalled();
      expect(invoicesService.generateForCommande).not.toHaveBeenCalled();
    });
  });
});
