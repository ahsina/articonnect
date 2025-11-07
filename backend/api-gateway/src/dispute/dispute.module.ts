import { Module } from '@nestjs/common';
import { DisputeController } from './controllers/dispute.controller';
import { DisputeService } from './services/dispute.service';

@Module({
  controllers: [DisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
