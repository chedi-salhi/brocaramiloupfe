import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

// Un seul Registry pour toute l'app, créé une fois au démarrage — sinon
// chaque redémarrage à chaud (start:dev) ou double-import du module
// dupliquerait les métriques et prom-client lèverait "metric already
// registered".
const register = new client.Registry();

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'status_code'],
    // Bornes pensées pour une API CRUD classique (la plupart des routes
    // répondent en quelques dizaines de ms, sauf upload/PDF facture qui
    // peuvent monter à quelques secondes).
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
  });

  readonly httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: "Nombre total de requêtes HTTP traitées, par méthode/route/code",
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  onModuleInit() {
    // Métriques par défaut de Node/process (mémoire heap, event loop lag,
    // handles actifs, CPU...) — gratuites avec prom-client, utiles pour un
    // premier dashboard "santé du service" sans rien coder de plus.
    client.collectDefaultMetrics({ register });
  }

  getRegistry(): client.Registry {
    return register;
  }
}
