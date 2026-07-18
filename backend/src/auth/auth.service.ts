import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { KeycloakAdminService } from '../users/keycloak-admin.service';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { generateVerificationToken, verifyVerificationToken } from './verification-token';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly emailService: EmailService,
  ) {}

  // Inscription libre (visiteur -> client) : crée le compte côté Keycloak
  // (identité + mot de passe) ET côté local (adresse, téléphone — Keycloak
  // ne les connaît pas). Le rôle "client" est assigné explicitement, comme
  // les comptes créés par l'admin dans UsersModule.
  async register(dto: RegisterDto) {
    const keycloakId = await this.keycloakAdminService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.prenom,
      lastName: dto.nom,
    });

    const clientRole = await this.keycloakAdminService.getRealmRole('client');
    await this.keycloakAdminService.assignRealmRole(keycloakId, {
      id: clientRole.id,
      name: clientRole.name,
    });

    const role = await this.prisma.role.findUnique({ where: { name: 'client' } });

    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        keycloakId,
        email: dto.email,
        nom: dto.nom,
        prenom: dto.prenom,
        adresse: dto.adresse,
        numTelephone: dto.numTelephone,
        roleId: role?.idRole,
        // Le compte Keycloak est utilisable tout de suite (connexion possible),
        // mais on garde une vérification d'email applicative distincte : la
        // commande (POST /orders) est bloquée tant que ce n'est pas confirmé.
        isVerified: false,
      },
    });

    // Un SMTP cassé ne doit jamais faire échouer l'inscription elle-même
    // (le compte Keycloak + local existent déjà à ce stade) — on logue l'échec
    // en clair pour pouvoir diagnostiquer, l'utilisateur pourra toujours
    // redemander le lien via /auth/resend-verification une fois le SMTP corrigé.
    await this.sendVerificationEmail(utilisateur.idUtilisateur, utilisateur.email);

    return utilisateur;
  }

  private async sendVerificationEmail(idUtilisateur: number, email: string) {
    const token = generateVerificationToken(idUtilisateur);
    const verifyUrl = `${FRONTEND_URL}/verifier-email?token=${token}`;
    try {
      await this.emailService.sendVerificationEmail(email, verifyUrl);
      this.logger.log(`Email de vérification envoyé à ${email}`);
    } catch (err) {
      this.logger.error(`Échec de l'envoi de l'email de vérification à ${email}`, err as Error);
    }
  }

  async verifyEmail(token: string) {
    const idUtilisateur = verifyVerificationToken(token);
    if (!idUtilisateur) {
      throw new BadRequestException('Lien de vérification invalide ou expiré');
    }

    const utilisateur = await this.prisma.utilisateur.update({
      where: { idUtilisateur },
      data: { isVerified: true },
    });

    return { email: utilisateur.email, isVerified: utilisateur.isVerified };
  }

  async resendVerification(tokenUser: AuthenticatedUser) {
    const utilisateur = await this.syncUser(tokenUser);
    if (utilisateur.isVerified) {
      return { alreadyVerified: true };
    }
    await this.sendVerificationEmail(utilisateur.idUtilisateur, utilisateur.email);
    return { alreadyVerified: false };
  }

  // Crée l'Utilisateur local à la première requête authentifiée, ou le met à jour
  // s'il existe déjà (email/nom/rôle peuvent changer côté Keycloak entre deux connexions).
  // C'est le seul endroit du backend qui écrit dans Utilisateur à partir d'un token.
  async syncUser(tokenUser: AuthenticatedUser) {
    const roleName = this.resolveRoleName(tokenUser.roles);
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });

    return this.prisma.utilisateur.upsert({
      where: { keycloakId: tokenUser.keycloakId },
      update: {
        email: tokenUser.email,
        nom: tokenUser.nom ?? undefined,
        prenom: tokenUser.prenom,
        roleId: role?.idRole,
      },
      create: {
        keycloakId: tokenUser.keycloakId,
        email: tokenUser.email,
        nom: tokenUser.nom ?? '',
        prenom: tokenUser.prenom,
        roleId: role?.idRole,
        isVerified: true, // l'email est déjà vérifié par Keycloak à ce stade
      },
    });
  }

  // Adresse/téléphone/nom/prénom + changement de mot de passe. Adresse et
  // numéro ne sont connus que de l'app ; nom/prénom/mot de passe appartiennent
  // à Keycloak — on les répercute là-bas en plus de la copie locale utilisée
  // pour l'affichage (évite un appel Keycloak à chaque page).
  async updateProfile(
    tokenUser: AuthenticatedUser,
    dto: { adresse?: string; numTelephone?: string; nom?: string; prenom?: string; newPassword?: string },
  ) {
    const { newPassword, ...profileFields } = dto;

    if (profileFields.nom !== undefined || profileFields.prenom !== undefined) {
      await this.keycloakAdminService.updateUser(tokenUser.keycloakId, {
        lastName: profileFields.nom,
        firstName: profileFields.prenom,
      });
    }

    if (newPassword) {
      await this.keycloakAdminService.resetPassword(tokenUser.keycloakId, newPassword);
    }

    return this.prisma.utilisateur.update({
      where: { keycloakId: tokenUser.keycloakId },
      data: profileFields,
    });
  }

  // Le rôle métier local reflète le rôle réel du token Keycloak.
  // Priorité admin > livreur > client si jamais plusieurs rôles sont présents.
  private resolveRoleName(roles: string[]): string {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('livreur')) return 'livreur';
    return 'client';
  }
}
