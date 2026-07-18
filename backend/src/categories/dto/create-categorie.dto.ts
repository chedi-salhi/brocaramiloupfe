import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  @IsNotEmpty()
  nom: string;
}
