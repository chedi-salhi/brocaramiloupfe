import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Inscription libre : pas de guard, c'est justement le point d'entrée
  // avant toute authentification.
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const utilisateur = await this.authService.register(dto);
    return { idUtilisateur: utilisateur.idUtilisateur, email: utilisateur.email };
  }

  // Retourne le profil local (créé au besoin) correspondant au token envoyé.
  // Le frontend appelle cette route juste après la connexion Keycloak.
  @Get('me')
  @UseGuards(KeycloakAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.syncUser(user);
  }

  // Adresse, téléphone, nom, prénom et mot de passe (optionnel) — l'email reste
  // le seul champ non éditable ici (identifiant de connexion Keycloak).
  @Patch('me')
  @UseGuards(KeycloakAuthGuard)
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user, dto);
  }

  // Lien cliqué depuis l'email de vérification — public, le jeton fait office
  // de preuve d'identité (voir verification-token.ts).
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(KeycloakAuthGuard)
  async resendVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.resendVerification(user);
  }
}
