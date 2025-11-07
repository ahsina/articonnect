import { Module } from '@nestjs/common';
import { SpecialtyController } from './controllers/specialty.controller';
import { SpecialtyService } from './services/specialty.service';

@Module({
  controllers: [SpecialtyController],
  providers: [SpecialtyService],
  exports: [SpecialtyService],
})
export class SpecialtyModule {}
