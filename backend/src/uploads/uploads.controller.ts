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

// Pièces jointes de la messagerie : images, vidéos et PDF.
const MESSAGE_ALLOWED_MIME = [...ALLOWED_MIME, 'application/pdf'];

function attachmentTypeFor(mimetype: string): 'IMAGE' | 'VIDEO' | 'FICHIER' {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  return 'FICHIER';
}

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

  // Upload d'une pièce jointe de message : ouvert à tout utilisateur
  // authentifié (client, livreur, admin) — contrairement à POST /uploads
  // réservé à l'admin. Renvoie l'URL, le type et le nom d'origine ; le
  // front les transmet ensuite dans l'événement Socket.io "message:send".
  @Post('message')
  @UseGuards(KeycloakAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!MESSAGE_ALLOWED_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('Format non supporté (image, vidéo ou PDF)'), false);
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadMessageAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    const result = await this.cloudinaryService.uploadBuffer(file.buffer, 'brocaramilou/messages');
    return {
      url: result.secure_url,
      type: attachmentTypeFor(file.mimetype),
      name: file.originalname,
    };
  }
}
