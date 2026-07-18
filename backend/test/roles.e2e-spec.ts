import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { KeycloakAuthGuard } from '../src/common/guards/keycloak-auth.guard';

// Test d'intégration HTTP réel (Supertest contre une app Nest bootstrapée en
// mémoire) : on vérifie le VRAI RolesGuard et le VRAI routage de AppController.
// Seule la vérification du token Keycloak est simulée — un serveur Keycloak
// vivant est hors de portée d'un test d'intégration rapide — via un header
// `x-test-roles` qui joue le rôle du token décodé.
class FakeAuthGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const rolesHeader = req.headers['x-test-roles'];
    if (rolesHeader === undefined) {
      throw new UnauthorizedException('Token manquant');
    }
    req.user = {
      keycloakId: 'test-user',
      email: 'test@test.com',
      roles: String(rolesHeader).split(','),
    };
    return true;
  }
}

describe('RolesGuard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    })
      .overrideGuard(KeycloakAuthGuard)
      .useClass(FakeAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health est public : aucun header nécessaire', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('GET /health/secure renvoie 401 sans token', () => {
    return request(app.getHttpServer()).get('/health/secure').expect(401);
  });

  it('GET /health/secure renvoie 200 avec un token valide, quel que soit le rôle', () => {
    return request(app.getHttpServer())
      .get('/health/secure')
      .set('x-test-roles', 'client')
      .expect(200)
      .expect((res) => {
        expect(res.body.user.roles).toEqual(['client']);
      });
  });

  it("GET /health/admin-only renvoie 403 pour un rôle non autorisé (livreur)", () => {
    return request(app.getHttpServer())
      .get('/health/admin-only')
      .set('x-test-roles', 'livreur')
      .expect(403);
  });

  it('GET /health/admin-only renvoie 401 sans token du tout', () => {
    return request(app.getHttpServer()).get('/health/admin-only').expect(401);
  });

  it("GET /health/admin-only renvoie 200 pour le rôle admin", () => {
    return request(app.getHttpServer())
      .get('/health/admin-only')
      .set('x-test-roles', 'admin')
      .expect(200);
  });

  it('un utilisateur avec plusieurs rôles (dont admin) passe aussi RolesGuard', () => {
    return request(app.getHttpServer())
      .get('/health/admin-only')
      .set('x-test-roles', 'client,admin')
      .expect(200);
  });
});
