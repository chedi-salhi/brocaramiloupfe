import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaypalClientService } from './paypal-client.service';
import { AuthModule } from '../auth/auth.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AuthModule, InvoicesModule, OrdersModule],
  providers: [PaymentsService, PaypalClientService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
