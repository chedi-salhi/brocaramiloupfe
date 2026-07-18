import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { KeycloakTokenService } from '../keycloak-token.service';

// Ne bloque jamais la requête (utilisé sur les routes accessibles aux visiteurs).
// Si un token Bearer valide est fourni, remplit request.user ; sinon la route
// continue en mode anonyme (identifié par x-session-token côté service).
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly tokenService: KeycloakTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.tokenService.extractToken(request);

    if (token) {
      try {
        request.user = await this.tokenService.verify(token);
      } catch {
        // Token fourni mais invalide sur une route publique : on l'ignore,
        // la requête est traitée comme anonyme plutôt que rejetée.
      }
    }

    return true;
  }
}
