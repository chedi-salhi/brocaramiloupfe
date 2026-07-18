import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

// @Global() : le service email est utilisé par plusieurs modules (payments,
// plus tard orders/annonces) sans avoir à réimporter EmailModule partout.
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
