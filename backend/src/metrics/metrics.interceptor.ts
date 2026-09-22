import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

// Interceptor global (voir MetricsModule) : mesure chaque requête HTTP sans
// que chaque contrôleur ait à s'en soucier. Les gateways Socket.io (chat,
// tracking commande) passent aussi par les interceptors globaux mais n'ont
// pas de "route" HTTP au sens Express — on les ignore ici (hors périmètre
// de ces métriques, un compteur de messages/évènements réaltime serait une
// addition séparée si besoin plus tard).
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // /metrics ne doit pas s'auto-compter comme requête "métier" — bruit
    // inutile dans les dashboards (et Prometheus scrape toutes les 15s).
    if (request.path === '/metrics') {
      return next.handle();
    }

    const start = process.hrtime.bigint();

    const record = () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      // request.route.path = pattern Nest ("/orders/:id"), pas l'URL brute
      // ("/orders/42") — sans ça, chaque id de commande créerait sa propre
      // série de métriques (cardinalité qui explose avec le temps).
      const route = request.route?.path ?? request.path ?? 'unknown';
      const labels = {
        method: request.method,
        route,
        status_code: String(response.statusCode),
      };
      this.metrics.httpRequestDuration.observe(labels, durationSeconds);
      this.metrics.httpRequestsTotal.inc(labels);
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
