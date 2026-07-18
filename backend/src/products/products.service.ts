import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  findAll(categorieId?: number, search?: string) {
    return this.prisma.produit.findMany({
      where: {
        categorieId: categorieId ?? undefined,
        // insensitive à la casse, cherche aussi bien "Chaise" que "chaise"
        nom: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      include: { categorie: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const produit = await this.prisma.produit.findUnique({
      where: { idProduit: id },
      include: { categorie: true },
    });
    if (!produit) {
      throw new NotFoundException(`Produit ${id} introuvable`);
    }
    return produit;
  }

  async create(dto: CreateProduitDto, tokenUser: AuthenticatedUser) {
    await this.ensureCategorieExists(dto.categorieId);

    // L'auteur du produit est l'admin connecté ; on s'assure que son compte local existe.
    const utilisateur = await this.authService.syncUser(tokenUser);

    return this.prisma.produit.create({
      data: {
        nom: dto.nom,
        description: dto.description,
        prix: dto.prix,
        stock: dto.stock,
        categorieId: dto.categorieId,
        utilisateurId: utilisateur.idUtilisateur,
        isAvailable: dto.isAvailable ?? true,
        imageUrl: dto.imageUrl,
      },
    });
  }

  async update(id: number, dto: UpdateProduitDto) {
    await this.findOne(id);

    if (dto.categorieId) {
      await this.ensureCategorieExists(dto.categorieId);
    }

    return this.prisma.produit.update({
      where: { idProduit: id },
      data: dto,
    });
  }

  // Suppression douce : un produit déjà commandé ou mis en favori ne peut pas être
  // supprimé physiquement (onDelete: Restrict côté CommandeProduit/Favori/PanierProduit).
  // On le désactive à la place, il disparaît du catalogue sans casser l'historique.
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.produit.update({
      where: { idProduit: id },
      data: { isAvailable: false },
    });
  }

  // Suppression définitive : uniquement possible si aucune commande/panier/favori
  // ne référence encore ce produit (onDelete: Restrict côté ces tables).
  async hardRemove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.produit.delete({ where: { idProduit: id } });
    } catch {
      throw new ConflictException(
        'Impossible de supprimer définitivement : ce produit est référencé dans des commandes, paniers ou favoris. Désactive-le à la place.',
      );
    }
  }

  private async ensureCategorieExists(categorieId: number) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { idCategorie: categorieId },
    });
    if (!categorie) {
      throw new BadRequestException(`Catégorie ${categorieId} introuvable`);
    }
  }
}
