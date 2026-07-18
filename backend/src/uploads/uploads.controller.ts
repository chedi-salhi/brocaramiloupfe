import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CloudinaryService } from './cloudinary.service';

const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

// Endpoint générique réutilisé pour les images produits ET le média des
// annonces : reçoit un fichier (image ou vidéo), l'envoie à Cloudinary,
// renvoie son URL publique (CDN, persistante). Les modules appelants se
// contentent de stocker cette URL (Produit.imageUrl, Annonce.mediaUrl) —
// aucun changement de schéma, c'est toujours juste une String.
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('Format non supporté (png/jpeg/webp/gif/mp4/webm/mov)'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    const result = await this.cloudinaryService.uploadBuffer(file.buffer);
    return { url: result.secure_url };
  }
}
