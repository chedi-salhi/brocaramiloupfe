import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, RealtimeModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  // Exporté pour PaymentsModule : captureOnlinePayment annule la commande
  // (restaure stock + panier) quand PayPal refuse le paiement.
  exports: [OrdersService],
})
export class OrdersModule {}
