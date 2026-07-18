import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Client HTTP minimal vers l'API Admin REST de Keycloak (suspendre un compte,
// changer un rôle). Utilise les identifiants admin du realm "master" — à
// remplacer par un compte de service dédié à moindre privilège en production.
@Injectable()
export class KeycloakAdminService {
  private cachedToken: CachedToken | null = null;
  private readonly keycloakUrl: string;
  private readonly realm: string;

  constructor(private readonly configService: ConfigService) {
    this.keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') ?? '';
    this.realm = this.configService.get<string>('KEYCLOAK_REALM') ?? '';
  }

  private async getAdminToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 5000) {
      return this.cachedToken.token;
    }

    const adminUser = this.configService.get<string>('KEYCLOAK_ADMIN_USER') ?? '';
    const adminPass = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD') ?? '';

    const response = await fetch(`${this.keycloakUrl}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'admin-cli',
        username: adminUser,
        password: adminPass,
        grant_type: 'password',
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        "Impossible de s'authentifier auprès de l'API admin Keycloak",
      );
    }

    const data = await response.json();
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.cachedToken.token;
  }

  private async request(path: string, init: RequestInit = {}) {
    const token = await this.getAdminToken();
    const response = await fetch(`${this.keycloakUrl}/admin/realms/${this.realm}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new InternalServerErrorException(`Erreur API Keycloak (${response.status}) : ${text}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // Création côté inscription libre : le compte est actif et l'email
  // pré-vérifié (pas de mailing de vérification en place pour l'instant).
  // Renvoie l'id Keycloak du nouvel utilisateur, extrait du header Location
  // (l'API admin ne renvoie pas de corps sur un create réussi).
  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<string> {
    const token = await this.getAdminToken();
    const response = await fetch(`${this.keycloakUrl}/admin/realms/${this.realm}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: data.email,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        enabled: true,
        emailVerified: true,
        credentials: [{ type: 'password', value: data.password, temporary: false }],
      }),
    });

    if (response.status === 409) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
    if (!response.ok) {
      const text = await response.text();
      throw new InternalServerErrorException(`Erreur API Keycloak (${response.status}) : ${text}`);
    }

    const location = response.headers.get('location');
    const keycloakId = location?.split('/').pop();
    if (!keycloakId) {
      throw new InternalServerErrorException("Keycloak n'a pas renvoyé l'id du nouvel utilisateur");
    }
    return keycloakId;
  }

  setUserEnabled(keycloakId: string, enabled: boolean) {
    return this.request(`/users/${keycloakId}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  // Nom/prénom modifiables depuis le profil app — répercutés côté Keycloak
  // (source de vérité de l'identité) en plus de la copie locale dans Utilisateur.
  updateUser(keycloakId: string, data: { firstName?: string; lastName?: string }) {
    return this.request(`/users/${keycloakId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Remplace le mot de passe directement côté Keycloak (temporary: false pour
  // ne pas forcer un changement au prochain login) — jamais stocké localement.
  resetPassword(keycloakId: string, newPassword: string) {
    return this.request(`/users/${keycloakId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ type: 'password', value: newPassword, temporary: false }),
    });
  }

  getRealmRole(roleName: string) {
    return this.request(`/roles/${roleName}`);
  }

  getUserRealmRoles(keycloakId: string): Promise<{ id: string; name: string }[]> {
    return this.request(`/users/${keycloakId}/role-mappings/realm`);
  }

  assignRealmRole(keycloakId: string, role: { id: string; name: string }) {
    return this.request(`/users/${keycloakId}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify([role]),
    });
  }

  removeRealmRole(keycloakId: string, role: { id: string; name: string }) {
    return this.request(`/users/${keycloakId}/role-mappings/realm`, {
      method: 'DELETE',
      body: JSON.stringify([role]),
    });
  }
}
