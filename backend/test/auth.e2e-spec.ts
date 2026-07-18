import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { KeycloakAuthGuard } from '../src/common/guards/keycloak-auth.guard';

// Même principe que roles.e2e-spec.ts : AuthService est mocké (sa logique
// métier a déjà sa propre couverture ailleurs — ce test-ci vérifie la couche
// HTTP : que le VRAI ValidationPipe rejette les payloads invalides, que les
// routes protégées exigent bien un token, et que le routage appelle le bon
// service avec les bons arguments.
class FakeAuthGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const userHeader = req.headers['x-test-user'];
    if (userHeader === undefined) {
      throw new UnauthorizedException('Token manquant');
    }
    req.user = JSON.parse(String(userHeader));
    return true;
  }
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const authService = {
    register: jest.fn(),
    syncUser: jest.fn(),
    updateProfile: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(KeycloakAuthGuard)
      .useClass(FakeAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    // Répliqué depuis main.ts : c'est ce pipe qui doit réellement rejeter les
    // payloads invalides, on veut le vrai comportement, pas un mock.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const validRegisterPayload = {
    email: 'nouveau@test.com',
    password: 'motdepasse123',
    nom: 'Ben Salah',
    prenom: 'Chedi',
    adresse: '12 rue de la République, Tunis',
  };

  describe('POST /auth/register', () => {
    it('appelle AuthService.register et renvoie idUtilisateur + email (payload valide)', async () => {
      authService.register.mockResolvedValue({ idUtilisateur: 1, email: validRegisterPayload.email });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterPayload)
        .expect(201);

      expect(res.body).toEqual({ idUtilisateur: 1, email: validRegisterPayload.email });
      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({ email: validRegisterPayload.email }),
      );
    });

    it('renvoie 400 si l’email est invalide (ValidationPipe réel)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validRegisterPayload, email: 'pas-un-email' })
        .expect(400);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('renvoie 400 si le mot de passe fait moins de 8 caractères', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validRegisterPayload, password: 'court' })
        .expect(400);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('renvoie 400 si un champ obligatoire est absent (adresse)', async () => {
      const { adresse, ...incomplet } = validRegisterPayload;
      await request(app.getHttpServer()).post('/auth/register').send(incomplet).expect(400);
      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/verify-email', () => {
    it('route publique : appelle AuthService.verifyEmail avec le token de la query string', async () => {
      authService.verifyEmail.mockResolvedValue({ verified: true });
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: 'abc.def' })
        .expect(200);
      expect(authService.verifyEmail).toHaveBeenCalledWith('abc.def');
    });
  });

  describe('routes protégées', () => {
    it('GET /auth/me renvoie 401 sans token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('GET /auth/me appelle syncUser avec le user authentifié', async () => {
      authService.syncUser.mockResolvedValue({ idUtilisateur: 3, isVerified: false });
      const user = { keycloakId: 'kc-3', email: 'c@test.com', roles: ['client'] };

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('x-test-user', JSON.stringify(user))
        .expect(200);

      expect(res.body).toEqual({ idUtilisateur: 3, isVerified: false });
      expect(authService.syncUser).toHaveBeenCalledWith(user);
    });

    it('PATCH /auth/me renvoie 401 sans token', () => {
      return request(app.getHttpServer()).patch('/auth/me').send({ nom: 'Test' }).expect(401);
    });

    it('PATCH /auth/me renvoie 400 si newPassword fait moins de 8 caractères', async () => {
      const user = { keycloakId: 'kc-3', email: 'c@test.com', roles: ['client'] };
      await request(app.getHttpServer())
        .patch('/auth/me')
        .set('x-test-user', JSON.stringify(user))
        .send({ newPassword: 'abc' })
        .expect(400);
      expect(authService.updateProfile).not.toHaveBeenCalled();
    });

    it('POST /auth/resend-verification renvoie 401 sans token', () => {
      return request(app.getHttpServer()).post('/auth/resend-verification').expect(401);
    });
  });
});
