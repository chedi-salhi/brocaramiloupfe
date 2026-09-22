import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

// Observabilité (Prometheus + Grafana) : ce module ne dépend d'aucun autre
// module métier, volontairement — juste un compteur/histogramme HTTP
// générique branché en interceptor global (voir MetricsInterceptor) plus
// les métriques par défaut de Node (mémoire, event loop, GC...) via
// prom-client. Grafana vient lire /metrics, exposé sans authentification
// (voir MetricsController) : en conditions réelles de prod, cette route
// devrait être fermée au réseau public (reverse proxy, réseau Docker
// interne...), mais ça sort du périmètre d'un projet de fin d'études — le
// but ici est de démontrer la chaîne complète scrape -> dashboard.
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
