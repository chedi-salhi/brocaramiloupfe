import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Usage : @Roles('admin') ou @Roles('admin', 'livreur') au-dessus d'une route,
// à combiner avec @UseGuards(KeycloakAuthGuard, RolesGuard).
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
