import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numTelephone?: string;

  // Nom/prénom : gérés par Keycloak à la base, mais éditables ici — on répercute
  // le changement des deux côtés (voir AuthService.updateProfile).
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  prenom?: string;

  // Changement de mot de passe : optionnel, va directement à Keycloak (jamais
  // stocké localement, aucune table de mots de passe côté app).
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
