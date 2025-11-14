import { Module } from '@nestjs/common';
import { DisputeController } from './controllers/dispute.controller';
import { DisputeService } from './services/dispute.service';
import { DisputeResolutionService } from './services/dispute-resolution.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [DisputeController],
  providers: [DisputeService, DisputeResolutionService],
  exports: [DisputeService, DisputeResolutionService],
})
export class DisputeModule {}
