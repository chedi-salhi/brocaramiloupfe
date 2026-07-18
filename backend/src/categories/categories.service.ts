import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategorieDto } from './dto/create-categorie.dto';
import { UpdateCategorieDto } from './dto/update-categorie.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.categorie.findMany({ orderBy: { nom: 'asc' } });
  }

  async findOne(id: number) {
    const categorie = await this.prisma.categorie.findUnique({
      where: { idCategorie: id },
    });
    if (!categorie) {
      throw new NotFoundException(`Catégorie ${id} introuvable`);
    }
    return categorie;
  }

  create(dto: CreateCategorieDto) {
    return this.prisma.categorie.create({ data: dto });
  }

  async update(id: number, dto: UpdateCategorieDto) {
    await this.findOne(id);
    return this.prisma.categorie.update({
      where: { idCategorie: id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.categorie.delete({ where: { idCategorie: id } });
    } catch {
      // onDelete: Restrict côté Produit — la catégorie a encore des produits liés.
      throw new ConflictException(
        'Impossible de supprimer une catégorie qui contient des produits',
      );
    }
  }
}
