import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  // Vue publique (visiteur/client) : seulement les annonces actuellement dans leur
  // fenêtre de diffusion.
  findActive() {
    const now = new Date();
    return this.prisma.annonce.findMany({
      where: { dateDebut: { lte: now }, dateFin: { gte: now } },
      orderBy: { dateDebut: 'desc' },
    });
  }

  // Vue admin : toutes les annonces, passées et futures incluses, pour la gestion.
  findAll() {
    return this.prisma.annonce.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const annonce = await this.prisma.annonce.findUnique({ where: { idAnnonce: id } });
    if (!annonce) {
      throw new NotFoundException(`Annonce ${id} introuvable`);
    }
    return annonce;
  }

  async create(dto: CreateAnnouncementDto, tokenUser: AuthenticatedUser) {
    const utilisateur = await this.authService.syncUser(tokenUser);
    const annonce = await this.prisma.annonce.create({
      data: {
        ...dto,
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        utilisateurId: utilisateur.idUtilisateur,
      },
    });

    // Prévient tout le monde (clients + livreurs) par email, sans bloquer la
    // réponse ni faire échouer la création si l'envoi échoue.
    this.notifyAllUsers(annonce.titre, annonce.description).catch(() => {});

    return annonce;
  }

  private async notifyAllUsers(titre: string, description: string) {
    const destinataires = await this.prisma.utilisateur.findMany({
      where: { role: { name: { in: ['client', 'livreur'] } } },
      select: { email: true },
    });
    await Promise.allSettled(
      destinataires.map((u) => this.emailService.sendAnnouncementNotification(u.email, titre, description)),
    );
  }

  async update(id: number, dto: UpdateAnnouncementDto) {
    await this.findOne(id);
    return this.prisma.annonce.update({
      where: { idAnnonce: id },
      data: {
        ...dto,
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : undefined,
        dateFin: dto.dateFin ? new Date(dto.dateFin) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.annonce.delete({ where: { idAnnonce: id } });
  }
}
