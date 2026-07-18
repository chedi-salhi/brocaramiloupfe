import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { KeycloakTokenService } from '../keycloak-token.service';

// Valide le token Bearer envoyé par le frontend. Bloque la requête si le token
// est manquant, invalide ou expiré.
@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(private readonly tokenService: KeycloakTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.tokenService.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      request.user = await this.tokenService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
