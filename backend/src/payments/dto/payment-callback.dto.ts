import { IsBoolean, IsString } from 'class-validator';

export class PaymentCallbackDto {
  @IsString()
  transactionId: string;

  @IsBoolean()
  success: boolean;
}
