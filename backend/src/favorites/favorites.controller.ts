import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SessionToken } from '../common/decorators/session-token.decorator';

@Controller('favorites')
@UseGuards(OptionalAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @SessionToken() sessionToken?: string) {
    return this.favoritesService.list(user, sessionToken);
  }

  @Post(':produitId')
  add(
    @Param('produitId', ParseIntPipe) produitId: number,
    @CurrentUser() user: AuthenticatedUser,
    @SessionToken() sessionToken?: string,
  ) {
    return this.favoritesService.add(produitId, user, sessionToken);
  }

  @Delete(':produitId')
  remove(
    @Param('produitId', ParseIntPipe) produitId: number,
    @CurrentUser() user: AuthenticatedUser,
    @SessionToken() sessionToken?: string,
  ) {
    return this.favoritesService.remove(produitId, user, sessionToken);
  }
}
