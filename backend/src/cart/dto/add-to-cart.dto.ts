import { IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  produitId: number;

  @IsInt()
  @Min(1)
  quantite: number;
}
