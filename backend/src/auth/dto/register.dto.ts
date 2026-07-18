import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsString()
  @IsNotEmpty()
  prenom: string;

  // Obligatoire : c'est un site e-commerce, pas de commande possible sans
  // adresse de livraison, donc on la demande dès l'inscription.
  @IsString()
  @IsNotEmpty()
  adresse: string;

  @IsOptional()
  @IsString()
  numTelephone?: string;
}
