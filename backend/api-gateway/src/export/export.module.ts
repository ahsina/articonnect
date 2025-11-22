import { Module } from '@nestjs/common';
import { ExportService } from './services/export.service';
import { ExportController } from './controllers/export.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
