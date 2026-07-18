import { IsInt } from 'class-validator';

export class AssignLivreurDto {
  @IsInt()
  livreurId: number;
}
