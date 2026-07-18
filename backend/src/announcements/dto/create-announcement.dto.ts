import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  titre: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  typeMedia: string;

  // Chemin relatif renvoyé par POST /uploads (ex: "/uploads/xxx.jpg"), pas
  // forcément une URL absolue — @IsUrl() la rejetait à tort.
  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @IsDateString()
  dateDebut: string;

  @IsDateString()
  dateFin: string;
}
