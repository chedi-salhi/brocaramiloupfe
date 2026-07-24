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
    const paypalClient = {
      createOrder: jest.fn().mockResolvedValue({
        id: 'PAYPAL-ORDER-1',
        status: 'CREATED',
        links: [{ rel: 'approve', href: 'https://paypal.test/approve/1', method: 'GET' }],
      }),
      captureOrder: jest.fn().mockResolvedValue({ id: 'PAYPAL-ORDER-1', status: 'COMPLETED' }),
    };
    const ordersService = {
      cancel: jest.fn().mockResolvedValue({ idCommande: 10, etat: 'ANNULEE' }),
      confirmOnlinePaymentSuccess: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PaymentsService(
      prisma as any,
      authService as any,
      emailService as any,
      invoicesService as any,
      paypalClient as any,
      ordersService as any,
    );

    return { service, prisma, authService, emailService, invoicesService, paypalClient, ordersService };
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
    // d'agir, contrairement à captureOnlinePayment (paiement en ligne) qui a bien ce
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

  const tokenClient = { keycloakId: 'kc-5', email: 'client@test.com', roles: ['client'] };

  describe('initiateOnlinePayment', () => {
    it("crée la commande PayPal et renvoie le lien d'approbation", async () => {
      const { service, prisma, paypalClient } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.EN_LIGNE, commande: { utilisateurId: 5 } }),
      );

      const result = await service.initiateOnlinePayment(10, tokenClient);

      expect(paypalClient.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ customId: '10' }),
      );
      expect(prisma.paiement.update).toHaveBeenCalledWith({
        where: { idPaiement: 1 },
        data: { transactionId: 'PAYPAL-ORDER-1', provider: 'paypal' },
      });
      expect(result).toEqual({ approvalUrl: 'https://paypal.test/approve/1' });
    });

    it("lève BadRequestException si la commande est en paiement à la livraison", async () => {
      const { service } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.A_LA_LIVRAISON, commande: { utilisateurId: 5 } }),
      );
      await expect(service.initiateOnlinePayment(10, tokenClient)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lève ForbiddenException si la commande n'appartient pas à l'appelant", async () => {
      const { service } = makeService(
        makePaiement({ methodePaiement: MethodePaiement.EN_LIGNE, commande: { utilisateurId: 999 } }),
      );
      await expect(service.initiateOnlinePayment(10, tokenClient)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lève NotFoundException si aucun paiement ne correspond à la commande', async () => {
      const { service } = makeService(null);
      await expect(service.initiateOnlinePayment(10, tokenClient)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('captureOnlinePayment', () => {
    it('capture le paiement, génère la facture et envoie les emails quand PayPal renvoie COMPLETED', async () => {
      const { service, prisma, invoicesService, paypalClient, ordersService } = makeService(
        makePaiement({
          methodePaiement: MethodePaiement.EN_LIGNE,
          commande: { utilisateurId: 5, utilisateur: { email: 'client@test.com' } },
        }),
      );

      const result = await service.captureOnlinePayment(10, tokenClient);

      expect(paypalClient.captureOrder).toHaveBeenCalledWith('tx-1');
      expect(prisma.paiement.update).toHaveBeenCalledWith({
        where: { idPaiement: 1 },
        data: { statut: StatutPaiement.SUCCESS, notificationSent: true },
      });
      // C'est cet appel qui décrémente réellement le stock et consomme le
      // panier — voir OrdersService.create, qui ne le fait plus lui-même
      // pour EN_LIGNE.
      expect(ordersService.confirmOnlinePaymentSuccess).toHaveBeenCalledWith(10);
      expect(invoicesService.generateForCommande).toHaveBeenCalledWith(10);
      expect(invoicesService.sendInvoiceByEmail).toHaveBeenCalledWith(10);
      expect(result.statut).toBe(StatutPaiement.SUCCESS);
      expect(ordersService.cancel).not.toHaveBeenCalled();
    });

    it("marque FAILED, annule la commande (sans rien restaurer : stock/panier n'ont jamais été touchés) et ne génère pas de facture quand PayPal ne renvoie pas COMPLETED", async () => {
      const { service, invoicesService, paypalClient, ordersService } = makeService(
        makePaiement({
          methodePaiement: MethodePaiement.EN_LIGNE,
          commande: { utilisateurId: 5, utilisateur: { email: 'client@test.com' } },
        }),
      );
      paypalClient.captureOrder.mockResolvedValueOnce({ id: 'PAYPAL-ORDER-1', status: 'DECLINED' });

      const result = await service.captureOnlinePayment(10, tokenClient);

      expect(result.statut).toBe(StatutPaiement.FAILED);
      expect(invoicesService.generateForCommande).not.toHaveBeenCalled();
      expect(ordersService.confirmOnlinePaymentSuccess).not.toHaveBeenCalled();
      // Régression : une commande jamais payée ne doit jamais rester visible
      // côté admin comme une commande confirmée — voir OrdersService.cancel.
      expect(ordersService.cancel).toHaveBeenCalledWith(10, tokenClient);
    });

    it("lève BadRequestException si aucun paiement PayPal n'a été initié (pas de transactionId)", async () => {
      const { service } = makeService(
        makePaiement({
          methodePaiement: MethodePaiement.EN_LIGNE,
          transactionId: null,
          commande: { utilisateurId: 5, utilisateur: { email: 'client@test.com' } },
        }),
      );
      await expect(service.captureOnlinePayment(10, tokenClient)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('est idempotent : ne capture pas deux fois un paiement déjà réussi', async () => {
      const { service, paypalClient, invoicesService } = makeService(
        makePaiement({
          methodePaiement: MethodePaiement.EN_LIGNE,
          statut: StatutPaiement.SUCCESS,
          commande: { utilisateurId: 5, utilisateur: { email: 'client@test.com' } },
        }),
      );

      await service.captureOnlinePayment(10, tokenClient);

      expect(paypalClient.captureOrder).not.toHaveBeenCalled();
      expect(invoicesService.generateForCommande).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si aucun paiement ne correspond à la commande', async () => {
      const { service } = makeService(null);
      await expect(service.captureOnlinePayment(10, tokenClient)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
