import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Lecture publique : visiteurs et clients consultent le catalogue sans compte.
  @Get()
  findAll(@Query('categorieId') categorieId?: string, @Query('search') search?: string) {
    return this.productsService.findAll(categorieId ? Number(categorieId) : undefined, search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // Écriture réservée aux admins.
  @Post()
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateProduitDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProduitDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  // Suppression définitive : distincte de la désactivation ci-dessus.
  // Échoue proprement (409) si le produit est référencé par une commande,
  // un panier ou des favoris.
  @Delete(':id/permanent')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @Roles('admin')
  removePermanent(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.hardRemove(id);
  }
}
