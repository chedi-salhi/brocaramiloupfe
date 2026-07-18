import { Injectable } from '@nestjs/common';
import { EtatCommande } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Agrégations calculées à la volée (pas de table de cache) : toujours à jour,
  // pas de risque de désynchronisation avec les vraies commandes.
  async getStats() {
    const [ventesAgg, commandesTotales, commandesParEtat, topProduits] = await Promise.all([
      this.prisma.commande.aggregate({
        _sum: { montantTotal: true },
        where: { etat: { not: EtatCommande.ANNULEE } },
      }),
      this.prisma.commande.count(),
      this.prisma.commande.groupBy({
        by: ['etat'],
        _count: { _all: true },
      }),
      this.prisma.commandeProduit.groupBy({
        by: ['produitId'],
        _sum: { quantite: true },
        orderBy: { _sum: { quantite: 'desc' } },
        take: 5,
      }),
    ]);

    const produitIds = topProduits.map((item) => item.produitId);
    const produits = await this.prisma.produit.findMany({
      where: { idProduit: { in: produitIds } },
    });

    const produitsPopulaires = topProduits.map((item) => ({
      produit: produits.find((p) => p.idProduit === item.produitId) ?? null,
      quantiteVendue: item._sum.quantite ?? 0,
    }));

    return {
      ventesTotales: Number((ventesAgg._sum.montantTotal ?? 0).toString()),
      commandesTotales,
      commandesParEtat: commandesParEtat.map((c) => ({ etat: c.etat, total: c._count._all })),
      produitsPopulaires,
    };
  }
}
