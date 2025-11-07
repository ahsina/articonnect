import { Module } from '@nestjs/common';
import { MissionController } from './controllers/mission.controller';
import { MissionService } from './services/mission.service';
import { NegotiationService } from './services/negotiation.service';

@Module({
  controllers: [MissionController],
  providers: [MissionService, NegotiationService],
  exports: [MissionService],
})
export class MissionModule {}
