import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

// Remplace le stockage disque local (perdu à chaque redémarrage/redéploiement,
// vécu deux fois sur ce projet) par Cloudinary : persistant, CDN, et supporte
// nativement les vidéos (resource_type: "auto" détecte tout seul image vs vidéo).
@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  uploadBuffer(buffer: Buffer, folder = 'brocaramilou'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException(
                `Échec de l'upload Cloudinary : ${error?.message ?? 'réponse vide'}`,
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }
}
