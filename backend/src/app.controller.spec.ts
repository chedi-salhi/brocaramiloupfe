import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KeycloakAuthGuard } from './common/guards/keycloak-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    // AppController protège health/secure et health/admin-only avec
    // KeycloakAuthGuard/RolesGuard (@UseGuards sur la classe) : Nest les
    // instancie à la compilation du module même si le test n'appelle que
    // getHello(), donc leurs dépendances (KeycloakTokenService, etc.)
    // doivent être fournies ou les guards eux-mêmes mockés. On les mocke
    // ici : ce test ne vérifie que la route publique.
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    })
      .overrideGuard(KeycloakAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
