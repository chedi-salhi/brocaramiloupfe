import { Global, Module } from '@nestjs/common';
import { KeycloakTokenService } from './keycloak-token.service';
import { SessionService } from './session.service';

@Global()
@Module({
  providers: [KeycloakTokenService, SessionService],
  exports: [KeycloakTokenService, SessionService],
})
export class CommonModule {}
