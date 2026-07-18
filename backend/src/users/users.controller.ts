import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { KeycloakAuthGuard } from '../common/guards/keycloak-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Toutes les routes sont réservées aux admins : gestion des comptes et des rôles.
@Controller('users')
@UseGuards(KeycloakAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/suspend')
  suspend(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setSuspended(id, true);
  }

  @Patch(':id/unsuspend')
  unsuspend(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.setSuspended(id, false);
  }

  @Patch(':id/role')
  changeRole(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeRoleDto) {
    return this.usersService.changeRole(id, dto.role);
  }
}
