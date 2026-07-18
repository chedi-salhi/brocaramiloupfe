import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SessionToken } from '../common/decorators/session-token.decorator';

// Accessible aux visiteurs (x-session-token) et aux clients connectés (Authorization
// Bearer) — OptionalAuthGuard ne bloque jamais, il remplit juste request.user si un
// token valide est fourni.
@Controller('cart')
@UseGuards(OptionalAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getPanier(@CurrentUser() user: AuthenticatedUser, @SessionToken() sessionToken?: string) {
    return this.cartService.getPanier(user, sessionToken);
  }

  @Post('items')
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: AuthenticatedUser,
    @SessionToken() sessionToken?: string,
  ) {
    return this.cartService.addItem(dto, user, sessionToken);
  }

  @Patch('items/:produitId')
  updateItem(
    @Param('produitId', ParseIntPipe) produitId: number,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser,
    @SessionToken() sessionToken?: string,
  ) {
    return this.cartService.updateItem(produitId, dto, user, sessionToken);
  }

  @Delete('items/:produitId')
  removeItem(
    @Param('produitId', ParseIntPipe) produitId: number,
    @CurrentUser() user: AuthenticatedUser,
    @SessionToken() sessionToken?: string,
  ) {
    return this.cartService.removeItem(produitId, user, sessionToken);
  }
}
