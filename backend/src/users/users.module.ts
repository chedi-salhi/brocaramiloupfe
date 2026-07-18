import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  providers: [UsersService, KeycloakAdminService],
  controllers: [UsersController],
  exports: [KeycloakAdminService],
})
export class UsersModule {}
