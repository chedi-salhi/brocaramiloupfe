import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategorieDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;
}
