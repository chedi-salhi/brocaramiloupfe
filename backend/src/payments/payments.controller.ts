import { Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Crée la commande PayPal (sandbox) et renvoie le lien d'approbation vers
  // lequel le frontend redirige le navigateur.
  @Post(':commandeId/initiate')
  @UseGuards(KeycloakAuthGuard)
  initiate(
    @Param('commandeId', ParseIntPipe) commandeId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.initiateOnlinePayment(commandeId, user);
  }

  // Appelé par la page /paiement/retour du frontend quand PayPal renvoie le
  // client sur l'app (return_url) — capture réellement les fonds.
  @Post(':commandeId/capture')
  @UseGuards(KeycloakAuthGuard)
  capture(
    @Param('commandeId', ParseIntPipe) commandeId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.captureOnlinePayment(commandeId, user);
  }

  @Patch(':commandeId/confirm-cash')
  @UseGuards(KeycloakAuthGuard)
  confirmCash(
    @Param('commandeId', ParseIntPipe) commandeId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.confirmCashPayment(commandeId, user);
  }
}
