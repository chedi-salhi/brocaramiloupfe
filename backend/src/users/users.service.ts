import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeycloakAdminService } from './keycloak-admin.service';

const ASSIGNABLE_ROLES = ['admin', 'client', 'livreur'];

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  findAll() {
    return this.prisma.utilisateur.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { idUtilisateur: id },
      include: { role: true },
    });
    if (!utilisateur) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    return utilisateur;
  }

  // Suspend/réactive un compte : à la fois localement (filtrage rapide) et côté
  // Keycloak (enabled:false bloque réellement la connexion, pas juste l'affichage).
  async setSuspended(id: number, suspended: boolean) {
    const utilisateur = await this.findOne(id);
    await this.keycloakAdmin.setUserEnabled(utilisateur.keycloakId, !suspended);
    return this.prisma.utilisateur.update({
      where: { idUtilisateur: id },
      data: { isSuspended: suspended },
    });
  }

  // Change le rôle réel côté Keycloak (retire les autres rôles assignables, ajoute
  // le nouveau) puis reflète le changement localement.
  async changeRole(id: number, roleName: string) {
    if (!ASSIGNABLE_ROLES.includes(roleName)) {
      throw new BadRequestException(`Rôle invalide : ${roleName}`);
    }

    const utilisateur = await this.findOne(id);
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundException(`Rôle ${roleName} introuvable en base`);
    }

    const keycloakRole = await this.keycloakAdmin.getRealmRole(roleName);
    const currentRoles = await this.keycloakAdmin.getUserRealmRoles(utilisateur.keycloakId);

    for (const assignable of ASSIGNABLE_ROLES) {
      if (assignable === roleName) continue;
      const existing = currentRoles.find((r) => r.name === assignable);
      if (existing) {
        await this.keycloakAdmin.removeRealmRole(utilisateur.keycloakId, existing);
      }
    }

    const alreadyHasRole = currentRoles.some((r) => r.name === roleName);
    if (!alreadyHasRole) {
      await this.keycloakAdmin.assignRealmRole(utilisateur.keycloakId, keycloakRole);
    }

    return this.prisma.utilisateur.update({
      where: { idUtilisateur: id },
      data: { roleId: role.idRole },
      include: { role: true },
    });
  }
}
