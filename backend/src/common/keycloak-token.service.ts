import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as jwksRsa from 'jwks-rsa';
import { AuthenticatedUser } from './decorators/current-user.decorator';

// Logique de vérification du token Keycloak, partagée entre KeycloakAuthGuard
// (bloque si absent/invalide) et OptionalAuthGuard (ignore silencieusement si absent/invalide).
@Injectable()
export class KeycloakTokenService {
  private readonly jwks: jwksRsa.JwksClient;
  private readonly issuer: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL');
    const realm = this.configService.get<string>('KEYCLOAK_REALM');
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.jwks = jwksRsa({
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
      cache: true,
      rateLimit: true,
    });
  }

  extractToken(request: { headers: Record<string, string> }): string | undefined {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    const decoded = this.jwtService.decode(token, { complete: true }) as {
      header?: { kid?: string };
    } | null;

    if (!decoded?.header?.kid) {
      throw new UnauthorizedException('Token invalide');
    }

    const publicKey = await this.getSigningKey(decoded.header.kid);

    const payload = await this.jwtService.verifyAsync(token, {
      publicKey,
      algorithms: ['RS256'],
      issuer: this.issuer,
    });

    return {
      keycloakId: payload.sub,
      email: payload.email,
      nom: payload.family_name,
      prenom: payload.given_name,
      roles: payload.realm_access?.roles ?? [],
    };
  }

  private getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwks.getSigningKey(kid, (err, key) => {
        if (err || !key) return reject(err);
        resolve(key.getPublicKey());
      });
    });
  }
}
