import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Représente un visiteur non connecté. Le frontend génère un token (UUID) une seule
// fois, le stocke côté client (localStorage), et l'envoie via l'en-tête x-session-token
// sur les routes panier/favoris. Sert de pont avant l'inscription/connexion.
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  // upsert plutôt que findUnique + create : à l'arrivée d'un nouveau visiteur,
  // le panier ET les favoris appellent cette méthode en parallèle avec le même
  // token. Avec un "chercher puis créer", les deux requêtes ne trouvent rien
  // et la seconde échoue sur la contrainte unique (P2002 -> erreur 500).
  async getOrCreate(token: string) {
    return this.prisma.session.upsert({
      where: { token },
      update: {},
      create: {
        token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
