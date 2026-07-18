import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  keycloakId: string;
  email: string;
  nom?: string;
  prenom?: string;
  roles: string[];
}

// Usage : @CurrentUser() user: AuthenticatedUser dans les paramètres d'une route,
// disponible uniquement sur les routes protégées par KeycloakAuthGuard.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
