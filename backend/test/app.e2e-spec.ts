import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Boilerplate généré par `nest new`, jamais adapté depuis : boote l'AppModule
// complet (Prisma inclus), donc exige un Postgres réellement accessible pour
// que $connect() réussisse — ce qui échoue en CI tant qu'aucun service de
// base de données n'y est configuré. La couverture HTTP de AppController est
// déjà assurée sans dépendance externe par roles.e2e-spec.ts (route publique
// + guards réels). Skip volontaire, à réactiver quand un service Postgres
// sera ajouté au workflow CI (prévu avec les tests Playwright end-to-end).
describe.skip('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
