import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() : évite de réimporter PrismaModule dans chaque module métier,
// PrismaService reste le seul point d'accès à la base de données.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
