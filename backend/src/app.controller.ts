import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { KeycloakAuthGuard } from './common/guards/keycloak-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from './common/decorators/current-user.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Route publique, pas de guard : sert à vérifier que l'API tourne.
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Route protégée : nécessite un token Bearer valide émis par Keycloak.
  // Sert à valider que le guard fonctionne de bout en bout.
  @Get('health/secure')
  @UseGuards(KeycloakAuthGuard)
  healthSecure(@CurrentUser() user: AuthenticatedUser) {
    return { status: 'ok', user };
  }

  // Route protégée + rôle requis : sert à valider RolesGuard.
  @Get('health/admin-only')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  healthAdminOnly(@CurrentUser() user: AuthenticatedUser) {
    return { status: 'ok', user };
  }
}
