import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':commandeId/initiate')
  @UseGuards(KeycloakAuthGuard)
  initiate(
    @Param('commandeId', ParseIntPipe) commandeId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.initiateOnlinePayment(commandeId, user);
  }

  // Simule le webhook du prestataire de paiement : pas de token Keycloak ici, en
  // production ce serait une vérification de signature envoyée par Flouci.
  @Post('callback')
  callback(@Body() dto: PaymentCallbackDto) {
    return this.paymentsService.handleCallback(dto.transactionId, dto.success);
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
