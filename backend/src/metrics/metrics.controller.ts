import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

// Pas de KeycloakAuthGuard ici, volontairement : Prometheus scrape cette
// route en HTTP simple, sans jeton OIDC — c'est Prometheus/Grafana lui-même
// qui n'est exposé qu'au réseau Docker interne (voir docker-compose.yml),
// pas cette route qui doit rester ouverte.
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    const registry = this.metrics.getRegistry();
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  }
}
