import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Lit l'en-tête x-session-token, envoyé par le frontend pour identifier un visiteur
// non connecté (panier/favoris temporaires). Absent si l'utilisateur est connecté
// ou si le frontend n'a pas encore généré de token pour ce visiteur.
export const SessionToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const header = request.headers['x-session-token'];
    return Array.isArray(header) ? header[0] : header;
  },
);
