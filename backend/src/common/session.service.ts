import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Représente un visiteur non connecté. Le frontend génère un token (UUID) une seule
// fois, le stocke côté client (localStorage), et l'envoie via l'en-tête x-session-token
// sur les routes panier/favoris. Sert de pont avant l'inscription/connexion.
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(token: string) {
    const existing = await this.prisma.session.findUnique({ where: { token } });
    if (existing) return existing;

    return this.prisma.session.create({
      data: {
        token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
