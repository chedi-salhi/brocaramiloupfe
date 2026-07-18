import { IsEnum } from 'class-validator';
import { EtatCommande } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(EtatCommande)
  etat: EtatCommande;
}
