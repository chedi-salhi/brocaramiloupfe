import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EtatCommande, MethodePaiement, StatutPaiement } from '@prisma/client';
import { OrdersService } from './orders.service';

// Tests unitaires purs (mêmes conventions que payments.service.spec.ts et
// invoices.service.spec.ts) : Prisma est mocké à la main, `$transaction`
// rejoue simplement le callback avec le même mock (voir
// invoices.service.spec.ts) — pas de TestingModule Nest, on teste la logique
// métier, pas le câblage DI.
//
// Couvre en particulier l'invariant central du 22/07/2026 : pour une
// commande EN_LIGNE, le stock et le panier ne doivent JAMAIS être touchés
// avant une capture PayPal réussie (voir create()/confirmOnlinePaymentSuccess()),
// et cancel() ne doit restaurer que ce qui a réellement été consommé.
describe('OrdersService', () => {
  const utilisateur = { idUtilisateur: 5, isVerified: true };

  function makePrisma(overrides: {
    panier?: unknown;
    commande?: unknown;
    utilisateurFind?: unknown;
  } = {}) {
    const prisma: any = {
      panier: {
        findUnique: jest.fn().mockResolvedValue(overrides.panier ?? null),
        upsert: jest.fn(),
      },
      commande: {
        findUnique: jest.fn().mockResolvedValue(overrides.commande ?? null),
        create: jest.fn(),
        update: jest.fn(),
      },
      produit: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      panierProduit: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      utilisateur: {
        findUnique: jest.fn().mockResolvedValue(overrides.utilisateurFind ?? null),
      },
    };
    prisma.$transaction = jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    return prisma;
  }

  function makeService(overrides: Parameters<typeof makePrisma>[0] = {}) {
    const prisma = makePrisma(overrides);
    const authService = { syncUser: jest.fn().mockResolvedValue(utilisateur) };
    const trackingGateway = { notifyOrderUpdate: jest.fn() };
    const emailService = { sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined) };

    const service = new OrdersService(
      prisma as any,
      authService as any,
      trackingGateway as any,
      emailService as any,
    );

    return { service, prisma, authService, trackingGateway, emailService };
  }

  const tokenClient = { keycloakId: 'kc-5', email: 'client@test.com', roles: ['client'] };
  const tokenAdmin = { keycloakId: 'kc-9', email: 'admin@test.com', roles: ['admin'] };
  // idUtilisateur=5 (voir `utilisateur` ci-dessus) : pour représenter un
  // livreur correctement assigné, la commande de test doit utiliser
  // livreurId: 5 (même convention que payments.service.spec.ts).
  const tokenLivreur = { keycloakId: 'kc-2', email: 'l@test.com', roles: ['livreur'] };

  describe('create', () => {
    function makePanier(overrides: Record<string, unknown> = {}) {
      return {
        idPanier: 1,
        utilisateurId: 5,
        produits: [
          {
            produitId: 100,
            quantite: 2,
            prixUnitaire: { toString: () => '10.00' },
            produit: { nom: 'Miel', isAvailable: true, stock: 50 },
          },
        ],
        ...overrides,
      };
    }

    it("EN_LIGNE : ne décrémente pas le stock et ne vide pas le panier (tant que le paiement n'est pas confirmé)", async () => {
      const { service, prisma } = makeService({ panier: makePanier() });
      prisma.commande.create.mockResolvedValue({ idCommande: 1 });

      await service.create(tokenClient, {
        adresseLivraison: 'Tunis',
        methodePaiement: MethodePaiement.EN_LIGNE,
      } as any);

      expect(prisma.produit.update).not.toHaveBeenCalled();
      expect(prisma.panierProduit.deleteMany).not.toHaveBeenCalled();
    });

    it('A_LA_LIVRAISON : décrémente le stock et vide le panier immédiatement', async () => {
      const { service, prisma } = makeService({ panier: makePanier() });
      prisma.commande.create.mockResolvedValue({ idCommande: 1 });

      await service.create(tokenClient, {
        adresseLivraison: 'Tunis',
        methodePaiement: MethodePaiement.A_LA_LIVRAISON,
      } as any);

      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { idProduit: 100 },
        data: { stock: { decrement: 2 } },
      });
      expect(prisma.panierProduit.deleteMany).toHaveBeenCalledWith({ where: { panierId: 1 } });
    });

    it('lève BadRequestException si le panier est vide', async () => {
      const { service } = makeService({ panier: { idPanier: 1, produits: [] } });
      await expect(
        service.create(tokenClient, {
          adresseLivraison: 'Tunis',
          methodePaiement: MethodePaiement.EN_LIGNE,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si le stock est insuffisant', async () => {
      const { service } = makeService({
        panier: makePanier({
          produits: [
            {
              produitId: 100,
              quantite: 5,
              prixUnitaire: { toString: () => '10.00' },
              produit: { nom: 'Miel', isAvailable: true, stock: 2 },
            },
          ],
        }),
      });
      await expect(
        service.create(tokenClient, {
          adresseLivraison: 'Tunis',
          methodePaiement: MethodePaiement.EN_LIGNE,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève ForbiddenException si l'email n'est pas vérifié", async () => {
      const { service, authService } = makeService({ panier: makePanier() });
      authService.syncUser.mockResolvedValueOnce({ idUtilisateur: 5, isVerified: false });
      await expect(
        service.create(tokenClient, {
          adresseLivraison: 'Tunis',
          methodePaiement: MethodePaiement.EN_LIGNE,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmOnlinePaymentSuccess', () => {
    it('décrémente le stock et retire du panier la quantité correspondante', async () => {
      const commande = { idCommande: 10, utilisateurId: 5, produits: [{ produitId: 100, quantite: 2 }] };
      const { service, prisma } = makeService({ commande });
      prisma.panier.findUnique.mockResolvedValue({ idPanier: 1 });
      prisma.panierProduit.findFirst.mockResolvedValue({ idPanierProduit: 7, quantite: 5 });

      await service.confirmOnlinePaymentSuccess(10);

      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { idProduit: 100 },
        data: { stock: { decrement: 2 } },
      });
      // quantité en panier (5) > quantité commandée (2) : décrément, pas suppression.
      expect(prisma.panierProduit.update).toHaveBeenCalledWith({
        where: { idPanierProduit: 7 },
        data: { quantite: { decrement: 2 } },
      });
      expect(prisma.panierProduit.delete).not.toHaveBeenCalled();
    });

    it('supprime la ligne du panier si la quantité commandée couvre tout ce qui y est', async () => {
      const commande = { idCommande: 10, utilisateurId: 5, produits: [{ produitId: 100, quantite: 5 }] };
      const { service, prisma } = makeService({ commande });
      prisma.panier.findUnique.mockResolvedValue({ idPanier: 1 });
      prisma.panierProduit.findFirst.mockResolvedValue({ idPanierProduit: 7, quantite: 5 });

      await service.confirmOnlinePaymentSuccess(10);

      expect(prisma.panierProduit.delete).toHaveBeenCalledWith({ where: { idPanierProduit: 7 } });
      expect(prisma.panierProduit.update).not.toHaveBeenCalled();
    });

    it("ne touche pas au panier si le client n'en a plus (déjà vidé entre-temps)", async () => {
      const commande = { idCommande: 10, utilisateurId: 5, produits: [{ produitId: 100, quantite: 2 }] };
      const { service, prisma } = makeService({ commande });
      prisma.panier.findUnique.mockResolvedValue(null);

      await service.confirmOnlinePaymentSuccess(10);

      expect(prisma.produit.update).toHaveBeenCalled();
      expect(prisma.panierProduit.findFirst).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si la commande est introuvable', async () => {
      const { service } = makeService({ commande: null });
      await expect(service.confirmOnlinePaymentSuccess(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    function makeCommande(overrides: Record<string, unknown> = {}) {
      return {
        idCommande: 10,
        utilisateurId: 5,
        etat: EtatCommande.EN_ATTENTE,
        produits: [{ produitId: 100, quantite: 2, prixUnitaire: { toString: () => '10.00' } }],
        paiement: { methodePaiement: MethodePaiement.A_LA_LIVRAISON, statut: StatutPaiement.PENDING },
        ...overrides,
      };
    }

    it('EN_LIGNE jamais payé : ne restaure ni le stock ni le panier, marque juste ANNULEE', async () => {
      const commande = makeCommande({
        paiement: { methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.PENDING },
      });
      const { service, prisma } = makeService({ commande });
      prisma.commande.update.mockResolvedValue({ ...commande, etat: EtatCommande.ANNULEE });

      await service.cancel(10, tokenClient);

      expect(prisma.produit.update).not.toHaveBeenCalled();
      expect(prisma.panier.upsert).not.toHaveBeenCalled();
      expect(prisma.commande.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idCommande: 10 },
          data: expect.objectContaining({ etat: EtatCommande.ANNULEE }),
        }),
      );
    });

    it('A_LA_LIVRAISON : restaure le stock et reconstitue le panier', async () => {
      const commande = makeCommande();
      const { service, prisma } = makeService({ commande });
      prisma.panier.upsert.mockResolvedValue({ idPanier: 1 });
      prisma.panierProduit.findFirst.mockResolvedValue(null);
      prisma.commande.update.mockResolvedValue({ ...commande, etat: EtatCommande.ANNULEE });

      await service.cancel(10, tokenClient);

      expect(prisma.produit.update).toHaveBeenCalledWith({
        where: { idProduit: 100 },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.panierProduit.create).toHaveBeenCalledWith({
        data: {
          panierId: 1,
          produitId: 100,
          quantite: 2,
          prixUnitaire: commande.produits[0].prixUnitaire,
        },
      });
    });

    it('EN_LIGNE déjà payé (SUCCESS) : restaure aussi, le stock avait bien été consommé', async () => {
      const commande = makeCommande({
        paiement: { methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.SUCCESS },
      });
      const { service, prisma } = makeService({ commande });
      prisma.panier.upsert.mockResolvedValue({ idPanier: 1 });
      prisma.panierProduit.findFirst.mockResolvedValue(null);
      prisma.commande.update.mockResolvedValue({ ...commande, etat: EtatCommande.ANNULEE });

      await service.cancel(10, tokenClient);

      expect(prisma.produit.update).toHaveBeenCalled();
      expect(prisma.panierProduit.create).toHaveBeenCalled();
    });

    it("lève BadRequestException si la commande n'est plus En attente", async () => {
      const commande = makeCommande({ etat: EtatCommande.LIVREE });
      const { service } = makeService({ commande });
      await expect(service.cancel(10, tokenClient)).rejects.toThrow(BadRequestException);
    });

    it("lève ForbiddenException si la commande n'appartient pas à l'appelant", async () => {
      const commande = makeCommande({ utilisateurId: 999 });
      const { service } = makeService({ commande });
      await expect(service.cancel(10, tokenClient)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assignLivreur', () => {
    it('bloque une commande EN_LIGNE non payée', async () => {
      const commande = {
        idCommande: 10,
        paiement: { methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.PENDING },
      };
      const { service } = makeService({ commande });
      await expect(service.assignLivreur(10, { livreurId: 7 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('autorise une commande EN_LIGNE déjà payée', async () => {
      const commande = {
        idCommande: 10,
        paiement: { methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.SUCCESS },
      };
      const { service, prisma } = makeService({
        commande,
        utilisateurFind: { idUtilisateur: 7, role: { name: 'livreur' } },
      });
      prisma.commande.update.mockResolvedValue({ idCommande: 10, livreurId: 7 });

      await expect(service.assignLivreur(10, { livreurId: 7 } as any)).resolves.toBeDefined();
    });

    it("lève BadRequestException si l'utilisateur ciblé n'est pas un livreur", async () => {
      const commande = {
        idCommande: 10,
        paiement: { methodePaiement: MethodePaiement.A_LA_LIVRAISON, statut: StatutPaiement.PENDING },
      };
      const { service } = makeService({
        commande,
        utilisateurFind: { idUtilisateur: 7, role: { name: 'client' } },
      });
      await expect(service.assignLivreur(10, { livreurId: 7 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lève NotFoundException si la commande est introuvable', async () => {
      const { service } = makeService({ commande: null });
      await expect(service.assignLivreur(999, { livreurId: 7 } as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    function makeCommande(overrides: Record<string, unknown> = {}) {
      return {
        idCommande: 10,
        utilisateurId: 5,
        livreurId: 5,
        etat: EtatCommande.EN_ATTENTE,
        paiement: { methodePaiement: MethodePaiement.A_LA_LIVRAISON, statut: StatutPaiement.PENDING },
        ...overrides,
      };
    }

    it('bloque toute progression EN_LIGNE non payée sauf ANNULEE', async () => {
      const commande = makeCommande({
        paiement: { methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.PENDING },
      });
      const { service } = makeService({ commande });
      await expect(
        service.updateStatus(10, tokenAdmin, { etat: EtatCommande.EN_LIVRAISON } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('autorise ANNULEE même si EN_LIGNE non payée', async () => {
      const commande = makeCommande({
        paiement: { methodePaiement: MethodePaiement.EN_LIGNE, statut: StatutPaiement.PENDING },
      });
      const { service, prisma } = makeService({ commande });
      prisma.commande.update.mockResolvedValue({ ...commande, etat: EtatCommande.ANNULEE });

      await expect(
        service.updateStatus(10, tokenAdmin, { etat: EtatCommande.ANNULEE } as any),
      ).resolves.toBeDefined();
    });

    it("bloque LIVREE tant que le cash n'est pas confirmé", async () => {
      const commande = makeCommande();
      const { service } = makeService({ commande });
      await expect(
        service.updateStatus(10, tokenAdmin, { etat: EtatCommande.LIVREE } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse toute modification d'une commande LIVREE/ANNULEE", async () => {
      const commande = makeCommande({ etat: EtatCommande.LIVREE });
      const { service } = makeService({ commande });
      await expect(
        service.updateStatus(10, tokenAdmin, { etat: EtatCommande.EN_LIVRAISON } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève ForbiddenException si l'appelant n'est ni admin ni le livreur assigné", async () => {
      const commande = makeCommande({ livreurId: 999 });
      const { service } = makeService({ commande });
      await expect(
        service.updateStatus(10, tokenLivreur, { etat: EtatCommande.EN_LIVRAISON } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('le livreur assigné peut faire progresser une commande cash confirmée', async () => {
      const commande = makeCommande({
        paiement: { methodePaiement: MethodePaiement.A_LA_LIVRAISON, statut: StatutPaiement.SUCCESS },
      });
      const { service, prisma } = makeService({ commande });
      prisma.commande.update.mockResolvedValue({ ...commande, etat: EtatCommande.LIVREE });

      await expect(
        service.updateStatus(10, tokenLivreur, { etat: EtatCommande.LIVREE } as any),
      ).resolves.toBeDefined();
    });
  });
});
