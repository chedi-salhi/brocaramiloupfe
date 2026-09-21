import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ALLOWED_ORIGINS } from './common/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // localhost:3000 pour le dev local (npm run dev). 127.0.0.1:3000 et
  // keycloak:3000 pour le frontend conteneurisé — keycloak:3000 est la
  // valeur réellement utilisée (voir docker-compose.yml, NEXTAUTH_URL), pour
  // que l'app et Keycloak partagent le même hôte et évitent le blocage de
  // cookie cross-site pendant la connexion (voir RECOVERY.md). Même liste
  // que les gateways Socket.io (voir common/cors-origins.ts) — les deux
  // canaux (REST et WebSocket) doivent accepter les mêmes origines.
  app.enableCors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Images produits/annonces uploadées par l'admin (voir UploadsModule) —
  // servies directement en fichiers statiques, pas besoin de passer par Nest.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  await app.listen(process.env.BACKEND_PORT ?? 3001);
}
bootstrap();
