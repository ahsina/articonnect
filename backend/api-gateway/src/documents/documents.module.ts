import { Module } from '@nestjs/common';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
