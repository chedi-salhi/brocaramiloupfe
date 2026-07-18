import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MethodePaiement } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  adresseLivraison: string;

  @IsEnum(MethodePaiement)
  methodePaiement: MethodePaiement;
}
