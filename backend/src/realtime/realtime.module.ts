import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { TrackingGateway } from './tracking.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ChatGateway, TrackingGateway],
  exports: [ChatGateway, TrackingGateway],
})
export class RealtimeModule {}
